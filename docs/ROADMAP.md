# Guardian v0.6.0 - Roadmap

> **Version:** 0.6.0 | **Statut:** En développement
> **Objectif:** Support multi-framework étendu, sécurité Rust/NestJS, tests DDoS/Stress

---

## 📊 Vue d'Ensemble

Guardian v0.6.0 étend la couverture de sécurité avec:
- **Support NestJS** (vulnérabilités spécifiques, guards, pipes)
- **Support Rust** (cargo-audit, memory safety, unsafe blocks)
- **Support Vite/VoidZero** (devtools, HMR, build tools)
- **Tests DDoS** (résistance aux attaques)
- **Stress Testing** (charge, mémoire, CPU)
- **OWASP Top 10 2021** (100% couverture)

---

## 🎯 Objectifs par Phase

### Phase 1: Foundation (Semaine 1)
**Objectif:** Architecture modulaire de détection

| Tâche | Description | Priorité |
|-------|-------------|----------|
| Créer `bin/detection/` | Architecture de détection modulaire | P0 |
| Détection NestJS | `nest-cli.json`, décorateurs, modules | P0 |
| Détection Rust | `Cargo.toml`, unsafe blocks, crates | P0 |
| Détection Vite | `vite.config.*`, dev server | P0 |
| Tests unitaires foundation | Couverture > 90% | P0 |

### Phase 2: NestJS Security (Semaine 2)
**Objectif:** Couverture complète des vulnérabilités NestJS

| Vulnérabilité | Outils | Tests |
|---------------|--------|-------|
| Pipe Injection | nuclei, dalfox | ✅ |
| Guard Bypass | Custom scanner | ✅ |
| GraphQL NestJS | graphqlmap | ✅ |
| WebSocket Auth | Custom test | ✅ |
| Throttler Bypass | vegeta, hey | ✅ |
| Prisma TypeORM | sqlmap enhanced | ✅ |

### Phase 3: Rust Security (Semaine 2-3)
**Objectif:** Sécurité native et mémoire

| Vulnérabilité | Outils | Tests |
|---------------|--------|-------|
| Unsafe Blocks | cargo-audit, static analysis | ✅ |
| Integer Overflow | cargo-deny, custom | ✅ |
| Use After Free | Memory analysis | ✅ |
| Race Conditions | Thread analysis | ✅ |
| Serde RCE | Payloads custom | ✅ |
| Axum/Rocket | Framework-specific | ✅ |

### Phase 4: Vite/VoidZero (Semaine 3)
**Objectif:** Sécurité des outils de développement modernes

| Vulnérabilité | Outils | Tests |
|---------------|--------|-------|
| HMR Injection | Dev server scanning | ✅ |
| Dependency Pre-bundling | Lockfile analysis | ✅ |
| Source Map Leak | Static analysis | ✅ |
| Optimizer Bypass | Build analysis | ✅ |
| VoidZero Tools | nv, vti, custom | ✅ |

### Phase 5: DDoS Protection (Semaine 3-4)
**Objectif:** Tests de résistance DDoS

| Type d'attaque | Outils | Métriques |
|---------------|--------|-----------|
| HTTP Flood | vegeta (1000 req/s) | < 5% errors |
| Slowloris | slowhttptest | < 10s timeout |
| Connection Exhaustion | hey, ab | < 1000 conn |
| API Rate Limit | Custom | Bypass detection |
| WebSocket Flood | Custom | Stability |

### Phase 6: Stress Testing (Semaine 4)
**Objectif:** Tests de charge complets

| Scénario | Métriques | Limites |
|----------|-----------|---------|
| Memory Leak | RAM usage | < 80% |
| Connection Pool | Active conn | < 1000 |
| Response Time | P95 latency | < 500ms |
| Error Rate | 5xx responses | < 1% |
| CPU Usage | % CPU | < 90% |

### Phase 7: OWASP Enhanced (Semaine 4-5)
**Objectif:** 100% couverture OWASP Top 10 2021

| OWASP 2021 | État | Ajouts |
|------------|------|--------|
| A01: Broken Access Control | ✅ | RBAC testing |
| A02: Cryptographic Failures | ⚠️ | Weak crypto detection |
| A03: Injection | ✅ | NoSQL, SSTI, GraphQL |
| A04: Insecure Design | ❌ | Threat modeling |
| A05: Security Misconfig | ✅ | Config analysis |
| A06: Vulnerable Components | ❌ | SCA integration |
| A07: Auth Failures | ✅ | Session testing |
| A08: Data Integrity | ⚠️ | Supply chain |
| A09: Logging Failures | ❌ | Log injection |
| A10: SSRF | ✅ | Bypass testing |

---

## 📁 Nouvelle Structure

```
guardian/
├── bin/
│   ├── detection/
│   │   ├── index.js              # Orchestrateur de détection
│   │   ├── nestjs.js             # Détection NestJS
│   │   ├── rust.js               # Détection Rust
│   │   ├── vite.js               # Détection Vite/VoidZero
│   │   ├── base.js               # Détection de base (existante)
│   │   └── utils.js              # Utilitaires de détection
│   ├── scanners/
│   │   ├── index.js              # Orchestrateur de scanners
│   │   ├── nestjs.js             # Scanner NestJS
│   │   ├── rust.js               # Scanner Rust
│   │   ├── vite.js               # Scanner Vite
│   │   ├── ddos.js               # Tests DDoS
│   │   ├── stress.js             # Tests de stress
│   │   └── owasp.js              # OWASP Top 10 scanner
│   ├── prompts/
│   │   ├── nestjs.md             # Prompts NestJS pour l'AI
│   │   ├── rust.md               # Prompts Rust
│   │   ├── vite.md               # Prompts Vite
│   │   └── owasp.md              # Prompts OWASP
│   ├── cli.js                    # Point d'entrée (mise à jour)
│   ├── config.js                 # Configuration (mise à jour)
│   ├── docker.js                 # Wrapper Docker
│   ├── platform.js               # Détection OS
│   ├── prompt.js                 # Génération de prompts
│   ├── validation.js             # Validation (mise à jour)
│   └── ui/
│       ├── colors.js
│       └── output.js
├── docker/
│   ├── Dockerfile                # Mis à jour avec nouveaux outils
│   └── scripts/
│       ├── nestjs-scan.sh        # Script de scan NestJS
│       ├── rust-scan.sh          # Script de scan Rust
│       └── vite-scan.sh          # Script de scan Vite
├── nuclei-templates/             # Nouveau répertoire
│   ├── nestjs/
│   │   ├── guard-bypass.yaml
│   │   ├── pipe-injection.yaml
│   │   ├── graphql-introspection.yaml
│   │   └── websocket-auth.yaml
│   ├── rust/
│   │   ├── unsafe-deser.yaml
│   │   ├── axum-path-injection.yaml
│   │   └── serde-rce.yaml
│   ├── vite/
│   │   ├── hmr-injection.yaml
│   │   ├── source-map-leak.yaml
│   │   └── optimizer-bypass.yaml
│   ├── ddos/
│   │   ├── rate-limit-bypass.yaml
│   │   └── slowloris.yaml
│   └── owasp-2021/
│       ├── A04-insecure-design.yaml
│       ├── A06-vulnerable-components.yaml
│       └── A09-logging-failures.yaml
├── tests/
│   ├── unit/
│   │   ├── cli.test.js
│   │   ├── config.test.js
│   │   ├── output.test.js
│   │   ├── validation.test.js
│   │   ├── detection.test.js     # NOUVEAU
│   │   └── scanners.test.js      # NOUVEAU
│   ├── integration/
│   │   ├── nestjs.test.js        # NOUVEAU
│   │   ├── rust.test.js          # NOUVEAU
│   │   ├── vite.test.js          # NOUVEAU
│   │   ├── ddos.test.js          # NOUVEAU
│   │   └── owasp.test.js         # NOUVEAU
│   ├── security/
│   │   ├── command-injection.test.js
│   │   ├── nestjs-vulns.test.js  # NOUVEAU
│   │   ├── rust-vulns.test.js    # NOUVEAU
│   │   └── vite-vulns.test.js    # NOUVEAU
│   └── stress/
│       ├── load.test.js          # NOUVEAU
│       ├── memory.test.js        # NOUVEAU
│       └── ddos.test.js          # NOUVEAU
├── wordlists/
│   ├── rust-fuzzing.txt          # NOUVEAU
│   ├── nestjs-payloads.txt       # NOUVEAU
│   ├── vite-payloads.txt         # NOUVEAU
│   └── ddos-user-agents.txt      # NOUVEAU
├── docs/
│   ├── ARCHITECTURE.md           # Mis à jour
│   ├── ROADMAP.md                # Ce fichier
│   ├── NESTJS.md                 # NOUVEAU
│   ├── RUST.md                   # NOUVEAU
│   ├── VITE.md                   # NOUVEAU
│   └── DDOS.md                   # NOUVEAU
└── prompt/
    └── REVIEW.md                 # Mis à jour avec nouveaux frameworks
```

---

## 🔧 Outils Docker Ajoutés

### Outils NestJS
```dockerfile
# GraphQL testing
RUN git clone --depth 1 https://github.com/doyensec/graphqlmap.git /opt/tools/graphqlmap

# NestJS-specific scripts
COPY docker/scripts/nestjs-scan.sh /usr/local/bin/nestjs-scan
```

### Outils Rust
```dockerfile
# Cargo audit (Rust security advisory)
RUN wget -q "https://github.com/EmbarkStudios/cargo-deny/releases/download/0.14.0/cargo-deny-0.14.0-x86_64-unknown-linux-gnu.tar.gz" \
    -O /tmp/cargo-deny.tar.gz && \
    tar -xzf /tmp/cargo-deno.tar.gz -C /tmp/downloads && \
    mv /tmp/downloads/cargo-deny /usr/local/bin/

# RustSec audit
RUN wget -q "https://github.com/rustsec/audit-check/releases/download/v0.2.0/cargo-audit-x86_64-unknown-linux-gnu.tgz" \
    -O /tmp/cargo-audit.tgz && \
    tar -xzf /tmp/cargo-audit.tgz -C /tmp/downloads && \
    mv /tmp/downloads/cargo-audit /usr/local/bin/
```

### Outils DDoS/Stress
```dockerfile
# Vegeta - HTTP load testing
RUN wget -q "https://github.com/tsenart/vegeta/releases/download/v12.11.1/vegeta_12.11.1_linux_amd64.tar.gz" \
    -O /tmp/vegeta.tar.gz && \
    tar -xzf /tmp/vegeta.tar.gz -C /tmp/downloads && \
    mv /tmp/downloads/vegeta /usr/local/bin/

# Hey - HTTP load generator
RUN wget -q "https://github.com/rakyll/hey/releases/download/v0.1.4/hey_linux_amd64" \
    -O /usr/local/bin/hey && chmod +x /usr/local/bin/hey

# Apache Bench
RUN apt-get install -y apache2-utils && rm -rf /var/lib/apt/lists/*
```

### Outils Vite/VoidZero
```dockerfile
# Node.js tools pour analyse Vite (package-lock analysis)
RUN npm install -g lockfile-lint @npmcli/arborist

# VoidZero tools (quand disponibles)
# nv (Node Version manager), vti (Vite inspector)
```

---

## 📊 Métriques de Succès

| Métrique | v0.5.7 | v0.6.0 (cible) |
|----------|--------|----------------|
| Taille image | ~650 MB | < 850 MB |
| Nombre d'outils | 12 | 25+ |
| Tests | 88 | 250+ |
| Couverture | 97.69% | > 95% |
| Frameworks supportés | 7 détectés | 10+ approfondis |
| OWASP 2021 | ~60% | 100% |
| Tests DDoS | 0 | 10+ |
| Tests Stress | 0 | 15+ |

---

## 🎯 Détection des Frameworks

### NestJS
```javascript
const NESTJS_MARKERS = [
  'nest-cli.json',
  '@nestjs/core' in package.json,
  '@nestjs/common' in package.json,
  '@nestjs/platform-*' in package.json,
  'src/main.ts' with 'NestFactory',
  '.module.ts' files,
  '@Controller', '@Injectable', '@Get' decorators
];
```

### Rust
```javascript
const RUST_MARKERS = [
  'Cargo.toml',
  'src/main.rs',
  'src/lib.rs',
  'target/' directory,
  '.rs' files,
  'actix-web', 'axum', 'rocket' in dependencies
  'tokio' runtime
];
```

### Vite/VoidZero
```javascript
const VITE_MARKERS = [
  'vite.config.*',
  '@vitejs/plugin-*' in package.json,
  'vite' in dependencies,
  'dev' script with 'vite',
  '.vite' directory
];

const VOIDZERO_MARKERS = [
  'nv' usage (package.json manager)
  'vti' usage (Vite CLI)
  'robo' usage (tasks)
  'nm' (Node manager)
];
```

---

## 🧪 Plans de Test

### Tests NestJS
```javascript
describe('NestJS Security', () => {
  test('detects NestJS application', async () => {
    const result = await detectFramework({ 'nest-cli.json': '{}' });
    expect(result.framework).toBe('nestjs');
  });

  test('detects guard bypass vulnerability', async () => {
    const vuln = await testGuardBypass(mockNestJSApp);
    expect(vuln.found).toBeDefined();
  });

  test('tests pipe injection', async () => {
    const result = await testPipeInjection('/api/search?query=');
    expect(result.safe).toBe(true);
  });
});
```

### Tests Rust
```javascript
describe('Rust Security', () => {
  test('detects Rust project', async () => {
    const result = await detectFramework({ 'Cargo.toml': '' });
    expect(result.framework).toBe('rust');
  });

  test('scans for unsafe blocks', async () => {
    const report = await scanUnsafeBlocks('src/main.rs');
    expect(report.unsafeCount).toBeDefined();
  });

  test('runs cargo audit', async () => {
    const result = await runCargoAudit('.');
    expect(result.vulnerabilities).toBeInstanceOf(Array);
  });
});
```

### Tests Vite
```javascript
describe('Vite Security', () => {
  test('detects Vite project', async () => {
    const result = await detectFramework({ 'vite.config.js': '' });
    expect(result.framework).toBe('vite');
  });

  test('checks for source map leaks', async () => {
    const result = await checkSourceMaps('./dist');
    expect(result.hasLeak).toBeDefined();
  });

  test('tests HMR injection', async () => {
    const result = await testHMRInjection('http://localhost:5173');
    expect(result.secure).toBe(true);
  });
});
```

### Tests DDoS
```javascript
describe('DDoS Resistance', () => {
  test('withstands HTTP flood', async () => {
    const result = await httpFloodTest(target, { rate: 1000, duration: 30 });
    expect(result.errorRate).toBeLessThan(0.05);
  });

  test('resists slowloris attack', async () => {
    const result = await slowlorisTest(target);
    expect(result.timeouts).toBeLessThan(10);
  });
});
```

---

## 📝 Changelog Entrée

```markdown
## [0.6.0] - 2025-Q1

### Added - NestJS Support
- Comprehensive NestJS framework detection
- Guard bypass testing
- Pipe injection scanning
- GraphQL NestJS security testing
- WebSocket authentication checks
- Throttler bypass detection
- Prisma/TypeORM specific injections

### Added - Rust Security
- Cargo.toml dependency analysis
- Unsafe block detection
- cargo-audit integration
- cargo-deny integration
- Axum/Rocket specific vulnerabilities
- Serde deserialization RCE testing
- Memory safety checks

### Added - Vite/VoidZero Support
- Vite configuration security analysis
- Source map leak detection
- HMR injection testing
- Pre-bundling dependency checks
- VoidZero tools integration (nv, vti, robo)

### Added - DDoS Testing
- HTTP flood resistance (vegeta)
- Slowloris attack testing
- Connection exhaustion tests
- Rate limit bypass detection
- WebSocket flood testing

### Added - Stress Testing
- Memory leak detection
- Connection pool testing
- Response time benchmarks
- CPU usage monitoring
- Error rate tracking

### Added - OWASP Top 10 2021
- A04: Insecure Design checks
- A06: Vulnerable Components (SCA)
- A09: Logging Failures testing
- 100% coverage of OWASP Top 10

### Enhanced
- Modulaire detection architecture
- 250+ tests (from 88)
- 25+ security tools (from 12)
- Framework-specific vulnerability templates
- Improved AI prompts per framework
```

---

## 🚀 Implémentation

Ce plan sera implémenté en **mode équipes parallèles**:

- **Team Foundation:** Architecture de détection, tests de base
- **Team NestJS:** Vulnérabilités et scanners NestJS
- **Team Rust:** Sécurité Rust, cargo tools
- **Team Vite:** Support Vite/VoidZero
- **Team DDoS:** Tests de résistance DDoS
- **Team Stress:** Framework de stress testing
- **Team OWASP:** Couverture complète Top 10

---

*Document généré pour Guardian v0.6.0 roadmap*
