# Vite/VoidZero Security Review Prompt

## Contexte

Vous effectuez un audit de sécurité d'une application **Vite**. Utilisez les méthodes et outils spécifiques à Vite et VoidZero pour identifier les vulnérabilités.

## Détection Vite

L'application est identifiée comme Vite par:
- `vite.config.js` ou `vite.config.ts` présent
- `vite` dans package.json (dependencies ou devDependencies)
- Scripts `dev` avec `vite`
- `.vite` directory

## Détection VoidZero

VoidZero est détecté par:
- Outils dans package.json: `nv` (node version), `vti` (vite inspector), `robo` (tasks)
- Lockfiles spécifiques: package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb

## Vulnérabilités Spécifiques Vite

### 1. HMR (Hot Module Replacement) Injection

**Description:** Le serveur de développement Vite HMR peut être exploité.

**Tests:**
```bash
# Vérifier si le client HMR est accessible
docker exec guardian-tools httpie GET \
  http://host.docker.internal:5173/@vite/client

# Vérifier la WebSocket HMR
docker exec guardian-tools curl -s -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://host.docker.internal:5173/__vite_hmr
```

**Indicateurs de vulnérabilité:**
- HMR accessible depuis l'extérieur en production
- Pas de vérification de l'origine pour les connexions HMR
- Code source exposé via HMR

**Correction:**
```javascript
// vite.config.js - S'assurer que HMR est désactivé en production
export default defineConfig({
  server: {
    hmr: process.env.NODE_ENV === 'development'
  }
});

// Ou utiliser un proxy en production
export default defineConfig({
  server: {
    proxy: {
      '/__vite_hmr': {
        target: 'http://localhost:5173',
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err) => { /* ... */ });
        }
      }
    }
  }
});
```

### 2. Source Map Leak

**Description:** Les source maps peuvent exposer le code source en production.

**Tests:**
```bash
# Vérifier les fichiers .map dans le build
docker exec guardian-tools sh -c '
  find /app/dist -name "*.map" -o -name "*.js.map"
'

# Télécharger et vérifier une source map
docker exec guardian-tools httpie GET \
  http://host.docker.internal:4173/assets/index-abc123.js.map
```

**Indicateurs de vulnérabilité:**
- Fichiers `.map` dans `dist/`
- Source maps accessibles publiquement
- Code source (comments, variables) visible

**Correction:**
```javascript
// vite.config.js - Désactiver les sourcemaps en production
export default defineConfig({
  build: {
    sourcemap: process.env.NODE_ENV === 'development' ? true : false
  }
});

// Pour le débogage production (avec auth):
export default defineConfig({
  build: {
    sourcemap: 'hidden', // inline mais ne pas générer .map séparés
    rollupOptions: {
      output: {
        // Obfusquer les noms de variables
        minifyInternalExports: true
      }
    }
  }
});
```

### 3. Dependency Pre-bundling Vulnerabilities

**Description:** Les dépendances pré-bundlées par Vite peuvent contenir des vulnérabilités.

**Tests:**
```bash
# Vérifier les dépendances dans node_modules/.vite
docker exec guardian-tools ls -la /app/node_modules/.vite

# Lancer npm audit
docker exec guardian-tools npm audit --json

# Vérifier package-lock.json
docker exec guardian-tools sh -c '
  grep -E "(lodash|axios| minimist)" /app/package-lock.json | head -5
'
```

**Indicateurs de vulnérabilité:**
- Dépendances vulnérables dans `node_modules`
- Package-lock.json non mis à jour
- Pas d'audit de sécurité

**Correction:**
```bash
# Mettre à jour les dépendances
npm update

# Auditer et corriger
npm audit fix

# Pour les dépendances spécifiques
npm install lodash@^4.17.21
```

### 4. Dev Server CORS Misconfiguration

**Description:** Le serveur de développement Vite peut avoir une configuration CORS trop permissive.

**Tests:**
```bash
# Tester CORS avec différentes origines
docker exec guardian-tools httpie GET \
  http://host.docker.internal:5173 Origin:evil.com

# Vérifier les headers CORS
docker exec guardian-tools httpie GET \
  http://host.docker.internal:5173 --print=h | grep -i "access-control"
```

**Indicateurs de vulnérabilité:**
- `access-control-allow-origin: *` en prod
- `access-control-allow-credentials: true` avec origine wildcard
- Origines malveillantes acceptées

**Correction:**
```javascript
// vite.config.js - Configurer CORS correctement
export default defineConfig({
  server: {
    cors: process.env.NODE_ENV === 'development'
      ? true // Permissif en dev
      : {
          origin: ['https://yourdomain.com'],
          credentials: true
        }
  }
});
```

### 5. Public Files Exposure

**Description:** Le répertoire `public/` peut contenir des fichiers sensibles.

**Tests:**
```bash
# Lister les fichiers dans public/
docker exec guardian-tools ls -la /app/public/

# Scanner les fichiers sensibles
docker exec guardian-tools sh -c '
  find /app/public -name ".*" -o -name "*.env" -o -name "*secret*"
'

# Essayer d'accéder aux fichiers
docker exec guardian-tools httpie GET \
  http://host.docker.internal:5173/.env
```

**Indicateurs de vulnérabilité:**
- Fichiers `.env*` dans `public/`
- Fichiers de configuration sensibles
- Documentation interne exposée

**Correction:**
```bash
# Déplacer les fichiers sensibles hors de public/
# .env.local, .env.production.local ne devraient jamais être dans public/

# Ajouter .gitignore pour public/
echo "public/.env*" >> .gitignore
```

### 6. Environment Variable Leakage

**Description:** Les variables d'environnement peuvent fuiter dans le bundle client.

**Tests:**
```bash
# Scanner le bundle pour les env vars
docker exec guardian-tools sh -c '
  grep -r "import.meta.env" /app/dist/assets/ 2>/dev/null | head -5
'

# Scanner les variables sensibles
docker exec guardian-tools sh -c '
  grep -rE "(SECRET|KEY|PASSWORD|TOKEN)" /app/dist/assets/ | grep -v "undefined"
'
```

**Indicateurs de vulnérabilité:**
- Variables d'environnement dans le bundle JS
- Secrets exposés dans le code client
- `import.meta.env` utilisé sans préfixe `VITE_`

**Correction:**
```javascript
// ÉVITER: Variables sensibles accessibles client
const API_KEY = process.env.API_KEY; // ❌

// PRÉFÉRER: Variables VITE_* ou côté serveur uniquement
const API_KEY = import.meta.env.VITE_PUBLIC_API_KEY; // ✅ OK (publique)
const SECRET_KEY = await fetch('/api/config'); // ✅ OK (côté serveur)

// vite.config.js - Configurer les variables exposées
export default defineConfig({
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
    // Ne PAS exposer les secrets
  }
});
```

## Vulnérabilités VoidZero

### 1. nv (Node Version Manager)

**Tests:**
```bash
# Vérifier la version de Node configurée
docker exec guardian-tools cat /app/.nvmrc 2>/dev/null || echo "No .nvmrc"

# Vérifier si nv détecte une vulnérabilité de version
docker exec guardian-tools nv version-manager 2>/dev/null || echo "nv not found"
```

**Correction:** Toujours utiliser des versions de Node.js supportées et sécurisées.

### 2. robo (Task Runner)

**Tests:**
```bash
# Vérifier les tasks robo
docker exec guardian-tools cat /app/robo.json 2>/dev/null || echo "No robo.json"

# Scanner pour les scripts dangereux
docker exec guardian-tools sh -c '
  grep -rE "(rm -rf|sudo|eval|exec)" /app/.robo/ 2>/dev/null
'
```

**Correction:** Valider toutes les tasks dans robo.json pour éviter l'injection de commandes.

### 3. Lockfile Integrity

**Tests:**
```bash
# Vérifier s'il y a plusieurs lockfiles
docker exec guardian-tools sh -c '
  ls -1 /app/*.lock /app/*lock* 2>/dev/null | wc -l
'

# Vérifier l'intégrité du lockfile
docker exec guardian-tools npm ci --dry-run 2>/dev/null || echo "Lockfile check failed"
```

**Correction:** Utiliser un seul gestionnaire de paquets et vérifier le lockfile dans le CI.

## Commandes Docker pour Vite

```bash
# Scanner la configuration Vite
docker exec guardian-tools cat /app/vite.config.js

# Vérifier les sourcemaps
docker exec guardian-tools find /app/dist -name "*.map"

# Tester le serveur de développement
docker exec guardian-tools httpie GET http://host.docker.internal:5173/

# Scanner les dépendances
docker exec guardian-tools npm audit

# Vérifier les fichiers publics
docker exec guardian-tools ls -la /app/public/
```

## Checklist Vite/VoidZero

- [ ] HMR désactivé ou protégé en production
- [ ] Sourcemaps désactivées en production
- [ ] Dépendances auditées et mises à jour
- [ ] CORS configuré avec origins explicites
- [ ] Aucun fichier sensible dans `public/`
- [ ] Variables d'environnement non sensibles côté client
- [ ] Seules les variables `VITE_*` exposées
- [ ] Lockfile vérifié dans le CI
- [ ] Un seul package manager utilisé
- [ ] Preview server sécurisé (si utilisé)
