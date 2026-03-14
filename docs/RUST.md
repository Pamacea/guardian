# Rust Security - Guardian v0.6.0

Documentation complète de l'analyse de sécurité pour applications Rust.

## Vue d'ensemble

Guardian analyse les applications Rust en détectant les vulnérabilités spécifiques au langage :
- **Unsafe blocks** - Code mémoire non sécurisé
- **Integer overflow** - Débordements d'entiers
- **Serde RCE** - Désérialisation arbitraire
- **Framework vulns** - Axum, Actix-Web, Rocket spécifiques
- **Dependencies** - Vulnérabilités des crates

## Détection

### Marqueurs de projet Rust

Guardian identifie un projet Rust par :
- `Cargo.toml` à la racine
- `src/main.rs` ou `src/lib.rs` présent
- Fichiers `.rs` dans `src/`

### Frameworks supportés

| Framework | Détection | Checks spécifiques |
|-----------|-----------|-------------------|
| **Actix-Web** | `actix-web` dans `[dependencies]` | Query injection, path extraction |
| **Axum** | `axum` dans `[dependencies]` | Path injection, extractor bypass |
| **Rocket** | `rocket` dans `[dependencies]` | Form injection, guard bypass |
| **Warp** | `warp` dans `[dependencies]` | Filter bypass, CORS issues |

## Vulnérabilités

### 1. Unsafe Blocks

**Risque :** Memory corruption, use-after-free, buffer overflows

**Détection :**
```bash
grep -rn "unsafe" src/
```

**Indicateurs :**
- Plus de 20 blocs `unsafe`
- `unsafe` sans commentaire
- `unsafe` dans du code exposé à l'extérieur

**Correction :**
```rust
// TOUJOURS commenter les blocs unsafe
// SAFE: Allocation validée par bounds check
unsafe {
    let ptr = Box::into_raw(Box::new(42));
    // ...
}

// PRÉFÉRER: utiliser des abstractions sûres
let value = Box::new(42);
```

### 2. Integer Overflow

**Risque :** Comportement inattendu, panic, contournement de sécurité

**Détection :**
```bash
grep -rnE "(wrapping_|saturating_|checked_)" src/
```

**Indicateurs :**
- `wrapping_*` sans validation
- Conversion `as` non vérifiée
- Calculs sur l'input utilisateur

**Correction :**
```rust
// ÉVITER
let result = a.wrapping_mul(b);

// PRÉFÉRER
let result = a.checked_mul(b).ok_or(Error::Overflow)?;
```

### 3. Serde Deserialization RCE

**Risque :** Exécution de code arbitraire

**Détection :**
```bash
grep -rn "from_str|from_slice" src/ | grep serde
```

**Indicateurs :**
- Désérialisation sans validation
- Types complexes (HashMap, Box<dyn Any>)
- Pas de limite de taille

**Correction :**
```rust
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

### 4. Axum Path Injection

**Risque :** Path traversal, LFI

**Détection :**
```bash
curl "http://target/files/../../../etc/passwd"
```

**Correction :**
```rust
async fn get_file(Path(path): Path<String>) -> impl IntoResponse {
    let clean_path = path
        .trim_start_matches('.')
        .replace("..", "");

    if !is_safe_path(&clean_path) {
        return StatusCode::BAD_REQUEST;
    }
    // ...
}
```

### 5. Actix-Web Query Injection

**Risque :** SQL injection via query params

**Détection :**
```bash
curl "http://target/api/search?q=' OR '1'='1"
```

**Correction :**
```rust
#[derive(Deserialize)]
struct SearchQuery {
    q: String,
}

async fn search(query: web::Query<SearchQuery>) -> impl IntoResponse {
    // Valider et utiliser des paramètres préparés
    db.execute("SELECT * FROM items WHERE name = $1", &[&query.q])
}
```

## Outils de scan

### cargo-audit

Scan des vulnérabilités connues dans les dépendances.

```bash
# Installation
cargo install cargo-audit

# Usage
cargo audit
cargo audit --json
```

**Sortie typique :**
```
Crate:         hyper
Vulnerability: RUSTSEC-2020-0001
Severity:      HIGH
Title:         Integer overflow in header parsing
URL:           https://rustsec.org/advisories/RUSTSEC-2020-0001
```

### cargo-deny

Lint pour les dépendances (licences, advisories, versions).

```bash
# Installation
cargo install cargo-deny

# Usage
cargo deny check
cargo deny check licenses
cargo deny check advisories
```

### Nuclei Templates

Guardian inclut des templates Nuclei pour Rust :

| Template | Cible |
|----------|-------|
| `rust-unsafe-arithmetic.yaml` | Integer overflow |
| `rust-unsafe-deser.yaml` | Serde RCE |
| `rust-axum-path-injection.yaml` | Axum path traversal |
| `rust-actix-query-injection.yaml` | Actix SQLi |
| `rust-rocket-form-injection.yaml` | Rocket form bypass |
| `rust-panic-dos.yaml` | Panic DoS |

## Docker Integration

Le container Guardian inclut les outils Rust :

```bash
# Lancer un scan complet
docker exec guardian-tools /guardian/bin/scanner.js rust /app

# Scan avec cargo-audit
docker exec guardian-tools cargo audit

# Lancer les templates Nuclei Rust
docker exec guardian-tools nuclei -t /nuclei-templates/rust/ -u http://target
```

## Structure de scan

```javascript
{
  "language": "rust",
  "edition": "2021",
  "framework": "axum",
  "checks": [
    {
      "name": "Unsafe Block Analysis",
      "status": "warning",
      "unsafeCount": 15,
      "details": [...]
    },
    {
      "name": "Integer Overflow Check",
      "status": "passed",
      "suspiciousOperations": []
    },
    {
      "name": "Cargo Audit",
      "status": "failed",
      "advisories": [...]
    }
  ],
  "vulnerabilities": [...]
}
```

## Checklist de sécurité

- [ ] Blocs `unsafe` documentés et justifiés
- [ ] `checked_*()` ou `saturating_*()` pour l'arithmétique
- [ ] `try_into()` pour les conversions
- [ ] Serde avec types structurés et validation
- [ ] Pas de pointeurs bruts non validés
- [ ] Paths et query strings validés
- [ ] `cargo audit` sans vulnérabilités
- [ ] `cargo deny` sans erreurs
- [ ] Pas de `unwrap()` sur l'input utilisateur
- [ ] Tests de fuzzing pour inputs critiques

## Ressources

- [Rust Security Guidelines](https://doc.rust-lang.org/nomicon/)
- [RustSec Advisory Database](https://rustsec.org/)
- [cargo-audit Documentation](https://github.com/RustSec/cargo-audit)
- [cargo-deny Documentation](https://github.com/EmbarkStudios/cargo-deny)
