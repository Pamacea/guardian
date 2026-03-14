# Rust Security Review Prompt

## Contexte

Vous effectuez un audit de sécurité d'une application **Rust**. Utilisez les méthodes et outils spécifiques à Rust pour identifier les vulnérabilités.

## Détection Rust

L'application est identifiée comme Rust par:
- `Cargo.toml` présent
- `src/main.rs` ou `src/lib.rs` présent
- Dépendances: actix-web, axum, rocket, warp, etc.

## Vulnérabilités Spécifiques Rust

### 1. Unsafe Blocks

**Description:** Les blocs `unsafe` peuvent introduire des vulnérabilités de mémoire.

**Tests:**
```bash
# Scanner les blocs unsafe
docker exec guardian-tools sh -c '
  find /app/src -name "*.rs" -exec grep -Hn "unsafe" {} \;
'

# Compter les unsafe blocks
docker exec guardian-tools sh -c '
  grep -r "unsafe" /app/src | wc -l
'
```

**Indicateurs de vulnérabilité:**
- Plus de 20 blocs unsafe
- Utilisation de `unsafe` sans commentaire de justification
- `unsafe` dans du code accessible depuis l'extérieur

**Correction:**
```rust
// TOUJOURS commenter les blocs unsafe
// SAFE: le pointeur provient d''une allocation valide
unsafe {
    let ptr = Box::into_raw(Box::new(42));
    // ...
}

// PRÉFÉRER: utiliser des abstractions sûres
let value = Box::new(42);
```

### 2. Integer Overflow

**Description:** Les overflows d'entiers peuvent causer des comportements inattendus.

**Tests:**
```bash
# Chercher les opérations potentiellement vulnérables
docker exec guardian-tools sh -c '
  grep -rnE "(wrapping_add|wrapping_sub|wrapping_mul|saturating_)" /app/src
'

# Chercher les conversions non vérifiées
docker exec guardian-tools sh -c '
  grep -rnE "as (u32|u64|i32|i64|usize)" /app/src
'
```

**Indicateurs de vulnérabilité:**
- `wrapping_*` utilisé sans validation
- Conversion `as` sans `try_into()` ou `checked_*()`
- Calculs arithmétiques sur l'entrée utilisateur

**Correction:**
```rust
// ÉVITER: wrapping non vérifié
let result = a.wrapping_mul(b);

// PRÉFÉRER: checked arithmetic
let result = a.checked_mul(b).ok_or(Error::Overflow)?;

// PRÉFÉRER: saturating arithmetic
let result = a.saturating_add(b);
```

### 3. Serde Deserialization RCE

**Description:** La désérialisation non restreinte peut exécuter du code arbitraire.

**Tests:**
```bash
# Chercher les utilisations de serde
docker exec guardian-tools sh -c '
  grep -rn "from_str" /app/src | grep serde
'

# Tester des payloads malveillants
docker exec guardian-tools httpie POST \
  http://host.docker.internal:8000/api/data \
  body='{"data": {"__unsafe_deserialization": "system(\"id\")"}}'
```

**Indicateurs de vulnérabilité:**
- `from_str` ou `from_slice` sans validation
- Désérialisation de types complexes (HashMap, Box<dyn Any>)
- Pas de limite sur la taille des données désérialisées

**Correction:**
```rust
// ÉVITER: désérialisation non restreinte
let data: HashMap<String, Value> = serde_json::from_str(&input)?;

// PRÉFÉRER: utiliser des types structurés
#[derive(Deserialize, Validate)]
struct SafeInput {
    #[validate(length(min = 1, max = 100))]
    name: String,
    #[validate(range(min = 0, max = 100))]
    value: i32,
}

let data: SafeInput = serde_json::from_str(&input)?;
data.validate()?;
```

### 4. Use After Free

**Description:** Utilisation de mémoire après libération.

**Tests:**
```bash
# Scanner les patterns suspects
docker exec guardian-tools sh -c '
  grep -rnE "(Box::from_raw|CString::into_raw)" /app/src
'

# Chercher les références dangling potentielles
docker exec guardian-tools sh -c '
  grep -rnE "lifetime.*'"'"'" /app/src
'
```

**Indicateurs de vulnérabilité:**
- `Box::from_raw` utilisé sans vérification
- Références retournées vers des données locales
- `unsafe` avec pointeurs bruts

**Correction:**
```rust
// ÉVITER: UAF potentiel
let data = vec
![1, 2, 3];
let ptr = data.as_ptr()
;
drop(data)
;
// NE PAS utiliser ptr ici!

// PRÉFÉRER: ownership correct
let data = vec
![1, 2, 3];
consume(data
);
```

### 5. Axum Path Injection

**Description:** Les extracteurs de chemins Axum peuvent être injectés.

**Tests:**
```bash
# Test path traversal
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:8000/files/../../../etc/passwd"

# Test injection dans les paramètres
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:8000/users/%2e%2e/%2e%2e/admin"
```

**Indicateurs de vulnérabilité:**
- `Path<T>` utilisé sans validation
- Pas de nettoyage des chemins
- Chemins non validés retournés au client

**Correction:**
```rust
// ÉVITER: Path non validé
async fn get_file(Path(path)
: Path<String>
) -> impl IntoResponse {
    // ...
}

// PRÉFÉRER: Path validé
async fn get_file(Path(path)
: Path<String>
) -> impl IntoResponse {
    // Nettoyer le chemin
    let clean_path = path
        .trim_start_matches('.')
        .trim_start_matches('/')
        .replace("..", "");

    // Valider
    if !clean_path.matches(
        safe_path_pattern) {
        return StatusCode::BAD_REQUEST;
    }

    // ...
}
```

### 6. Actix-Web Query Injection

**Description:** Les paramètres de requête Actix peuvent être injectés.

**Tests:**
```bash
# Test injection dans query params
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:8000/search?q=' OR '1'='1"

# Test path injection
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:8000/api/users/../../admin"
```

**Indicateurs de vulnérabilité:**
- `.data()` utilisé sans validation
- Query string passée directement à la DB
- Pas de validation des types

**Correction:**
```rust
// ÉVITER: query non validée
async fn search(query: web::Query<HashMap<String, String>>
) -> impl IntoResponse {
    let q = query.get("q").unwrap();
    db.execute(format!("SELECT * FROM items WHERE name = '{}'", q))
}

// PRÉFÉRER: query structurée et validée
#[derive(Deserialize)]
struct SearchQuery {
    q: String,
}

async fn search(query: web::Query<SearchQuery>
) -> impl IntoResponse {
    // Valider
    if query.q.is_empty() || query.q.len() > 100 {
        return HttpResponse::BadRequest().finish();
    }

    // Utiliser des paramètres
    db.execute("SELECT * FROM items WHERE name = $1", &[&query.q])
}
```

### 7. Dependency Vulnerabilities

**Description:** Les dépendances Rust peuvent contenir des vulnérabilités.

**Tests:**
```bash
# Lancer cargo-audit
docker exec guardian-tools cargo audit --json 2>/dev/null || echo "No cargo-audit"

# Lancer cargo-deny
docker exec guardian-tools cargo deny check 2>/dev/null || echo "No cargo-deny"

# Vérifier les versions des dépendances
docker exec guardian-tools sh -c '
  grep -E "^name = \"(hyper|openssl|tokio)\"" /app/Cargo.lock
'
```

**Indicateurs de vulnérabilité:**
- Advisories RustSec trouvées
- Versions de crates avec vulnérabilités connues
- Dépendances non mises à jour

**Correction:**
```bash
# Mettre à jour les dépendances
cargo update

# Pour les mises à jour de breaking changes
cargo update -p <crate_name>

# Vérifier les licences autorisées
cargo deny check licenses
```

## Commandes Docker pour Rust

```bash
# Analyser les blocs unsafe
docker exec guardian-tools sh -c 'grep -rn "unsafe" /app/src'

# Vérifier Cargo.lock
docker exec guardian-tools cat /app/Cargo.lock | grep "name ="

# Scanner avec cargo-audit
docker exec guardian-tools cargo audit

# Linter avec cargo-deny
docker exec guardian-tools cargo deny check

# Tester les endpoints web
docker exec guardian-tools httpie GET http://host.docker.internal:8000
```

## Checklist Rust

- [ ] Blocs `unsafe` documentés et justifiés
- [ ] `checked_*()` ou `saturating_*()` utilisé pour l'arithmétique
- [ ] `try_into()` pour les conversions potentiellement échouantes
- [ ] Serde avec types structurés et validation
- [ ] Pas de pointeurs bruts non validés
- [ ] Paths et query strings validés
- [ ] `cargo audit` sans vulnérabilités
- [ ] `cargo deny` sans erreurs
- [ ] Pas de `unwrap()` ou `expect()` sur l'entrée utilisateur
- [ ] Tests de fuzzing pour les inputs critiques
