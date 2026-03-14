# DDoS & Stress Testing Scanner

**Version:** v0.6.0
**Scanner:** `bin/scanners/ddos.js`, `bin/scanners/stress.js`

---

## Overview

Le scanner DDoS et Stress Testing de Guardian effectue des tests de résistance pour vérifier la résilience de votre application face aux attaques par déni de service et sous charge élevée.

---

## Détection

Le scanner est activé automatiquement lorsque les options suivantes sont spécifiées :

- **Options:** `--include-ddos`, `--include-stress`
- **Cible:** URL HTTP accessible
- **Environnement:** Conteneur Docker guardian-tools

---

## Tests DDoS

### 1. HTTP Flood Resistance (HIGH)

Teste la résistance de l'application aux inondations de requêtes HTTP.

**Tests effectués :**
- Envoi de 500 à 5000 requêtes/seconde
- Durée de 10 à 30 secondes
- Mesure du taux d'erreur

**Métriques :**
- Total des requêtes envoyées
- Requêtes réussies vs échouées
- Temps de réponse moyen
- Taux d'erreur (seuil d'alerte : > 10%)

**Commande équivalente :**
```bash
docker exec guardian-tools vegeta attack \
  -targets=/tmp/targets.txt \
  -rate=500 \
  -duration=10s | vegeta report
```

**Recommandation :**
- Implémenter un rate limiting par IP
- Utiliser un service de protection DDoS (Cloudflare, AWS Shield)
- Configurer des timeouts appropriés

---

### 2. Slowloris Attack Detection (HIGH)

Teste la vulnérabilité aux attaques Slowloris qui maintiennent des connexions ouvertes.

**Tests effectués :**
- 100 à 500 connexions lentes simultanées
- Durée de 30 à 60 secondes
- Envoi d'en-têtes HTTP très lents

**Métriques :**
- Connexions tentées
- Connexions qui ont expiré
- Taux de succès

**Commande équivalente :**
```bash
docker exec guardian-tools slowhttptest \
  -c 100 \
  -H host.docker.internal \
  -p 3000 \
  -l 30 \
  -i 10 \
  -r 0
```

**Indicateurs de vulnérabilité :**
- Connexions acceptées sans timeout
- Pool de connexions épuisé
- Aucun timeout de réponse configuré

**Recommandation :**
- Configurer des timeouts de connexion courts
- Limiter le nombre de connexions par IP
- Utiliser un reverse proxy avec protection

---

### 3. Connection Exhaustion (MEDIUM)

Teste si le pool de connexions peut être épuisé.

**Tests effectués :**
- 200 à 1000 connexions concurrentes
- 50 à 100 connexions simultanées
- Durée de 30 secondes

**Métriques :**
- Connexions maximales simultanées
- Connexions réussies
- Connexions rejetées

**Commande équivalente :**
```bash
docker exec guardian-tools hey \
  -n 10000 \
  -c 200 \
  -z 30s \
  http://host.docker.internal:3000
```

**Recommandation :**
- Augmenter la taille du pool de connexions
- Implémenter le pooling de connexions
- Ajouter des limites de connexions

---

### 4. Rate Limit Bypass (MEDIUM)

Teste diverses techniques de contournement des limites de taux.

**Techniques testées :**
- **X-Forwarded-For spoofing** : Falsification de l'IP
- **X-Real-IP manipulation** : Contournement par en-tête
- **User-Agent rotation** : Rotation de l'identité
- **X-Original-URI tricks** : Manipulation du chemin

**Commande équivalente :**
```bash
# Test avec X-Forwarded-For
for i in {1..50}; do
  docker exec guardian-tools curl -s -o /dev/null \
    -H "X-Forwarded-For: 127.0.0.1" \
    -w "%{http_code}" \
    http://host.docker.internal:3000/api/limited
done
```

**Recommandation :**
- Implémenter un rate limiting basé sur la connexion, pas les en-têtes
- Utiliser un reverse proxy de confiance pour la détection IP
- Envisager un WAF ou CDN

---

## Tests de Stress

### 1. Memory Leak Detection (MEDIUM)

Surveille l'utilisation de la mémoire pendant une charge soutenue.

**Tests effectués :**
- 5000 à 10000 requêtes
- 50 à 100 connexions concurrentes
- Mesure avant, pendant et après le test

**Métriques :**
- Mémoire initiale
- Mémoire maximale
- Mémoire finale
- Croissance de la mémoire

**Seuils d'alerte :**
- Avertissement : > 100 MB de croissance
- Critique : > 80% de la mémoire disponible

**Recommandation :**
- Profiler l'application avec des snapshots du heap
- Vérifier les fuites d'event listeners
- Examiner l'implémentation du cache

---

### 2. Connection Pool Testing (MEDIUM)

Teste le comportement du pool de connexions sous stress.

**Métriques :**
- Connexions maximales simultanées
- Connexions réussies
- Connexions rejetées
- Latence moyenne

**Seuil d'alerte :**
- Plus de 20% de connexions rejetées

---

### 3. Response Time Benchmarks (MEDIUM)

Mesure les temps de réponse P50, P95, P99 sous charge.

**Objectifs :**
- P50 latency : < 100ms
- P95 latency : < 500ms
- P99 latency : < 1000ms

**Seuils d'alerte :**
- Avertissement : P95 > 500ms
- Critique : P95 > 2000ms

**Recommandation :**
- Optimiser les requêtes de base de données
- Implémenter la mise en cache
- Envisager une scalabilité horizontale

---

### 4. Error Rate Testing (MEDIUM)

Surveille le taux d'erreur HTTP sous stress.

**Objectif :**
- Taux d'erreur : < 1%

**Seuils d'alerte :**
- Avertissement : Taux d'erreur > 1%
- Critique : Taux d'erreur > 5%

**Recommandation :**
- Investiguer les causes d'erreur
- Améliorer la gestion des erreurs
- Surveiller les logs d'erreur

---

### 5. CPU Usage Monitoring (HIGH)

Surveille l'utilisation du processeur pendant la charge.

**Seuils d'alerte :**
- Avertissement : CPU > 70%
- Critique : CPU > 90%

**Recommandation :**
- Profiler les points chauds CPU
- Optimiser les opérations intensives CPU
- Envisager une scalabilité horizontale

---

## Configuration

### Niveaux d'Intensité

| Niveau | Requêtes | Concurrence | Durée |
|--------|----------|-------------|-------|
| Low | 1000 | 10 | 10s |
| Medium | 5000 | 50 | 30s |
| High | 10000 | 100 | 60s |

### Options de Scan

```javascript
{
  target: 'http://localhost:3000',  // URL cible
  containerName: 'guardian-tools',   // Conteneur Docker
  aggressive: false,                  // Mode agressif
  intensity: 'medium',                // low, medium, high
  includeDDoS: true,                  // Inclure tests DDoS
  includeStress: true                 // Inclure tests de stress
}
```

### Limites de Taux Recommandées

Par endpoint :
- API publique : 100 req/min
- API authentifiée : 1000 req/min
- Endpoints admin : 100 req/min

---

## Templates Nuclei

Les templates Nuclei suivants sont disponibles dans `nuclei-templates/ddos/` :

| Template | Description | Sévérité |
|----------|-------------|----------|
| `rate-limit-bypass.yaml` | Contournement rate limit | MEDIUM |
| `slowloris.yaml` | Attaque Slowloris | HIGH |
| `http-flood.yaml` | Résistance HTTP flood | MEDIUM |
| `connection-exhaustion.yaml` | Épuisement connexions | HIGH |
| `memory-exhaustion.yaml` | Épuisement mémoire | HIGH |
| `user-agent-rotation.yaml` | Rotation UA bypass | MEDIUM |

---

## Wordlists

Situées dans `wordlists/` :

| Fichier | Usage |
|---------|-------|
| `ddos-user-agents.txt` | User-Agents pour tests de bypass |
| `ddos-headers.txt` | En-têtes HTTP pour contournement |

---

## Utilisation

### Scan DDoS complet
```bash
guardian scan --type ddos --target http://localhost:3000
```

### Avec conteneur
```bash
guardian scan --type ddos --target http://localhost:3000 --container guardian-tools
```

### Mode agressif
```bash
guardian scan --type ddos --target http://localhost:3000 --aggressive
```

### Tests de stress
```bash
guardian scan --type stress --target http://localhost:3000 --intensity high
```

### Résultat JSON
```json
{
  "name": "DDoS Resistance Test",
  "checks": [
    {
      "name": "HTTP Flood Test",
      "status": "passed",
      "metrics": {
        "totalRequests": 5000,
        "successfulRequests": 4950,
        "failedRequests": 50,
        "avgResponseTime": 45,
        "errorRate": 0.01
      }
    },
    {
      "name": "Rate Limit Bypass Test",
      "status": "failed",
      "vulnerabilities": [
        {
          "severity": "MEDIUM",
          "title": "Rate Limit Bypass Possible",
          "description": "Found 2 rate limit bypass techniques",
          "bypasses": [
            {
              "technique": "X-Forwarded-For",
              "successfulRequests": 15,
              "blockedRequests": 5
            }
          ]
        }
      ]
    }
  ],
  "summary": {
    "totalTests": 4,
    "passed": 3,
    "failed": 1
  }
}
```

---

## Codes de Statut

- **passed** : Test réussi, aucun problème détecté
- **warning** : Problème potentiel, investigation nécessaire
- **failed** : Vulnérabilité confirmée, correction requise
- **skipped** : Test impossible (outils non disponibles)

---

## Remediation

### Rate Limiting
```typescript
// NestJS
@UseGuards(ThrottlerGuard)
@Throttle(100, 60)
@Get('api/data')
async getData() { }

// Express
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Next.js (middleware)
export function middleware(request: NextRequest) {
  const rateLimit = createRateLimit({
    windowMs: 60 * 1000,
    max: 100,
  });
  return rateLimit(request);
}
```

### Protection DDoS
```nginx
# nginx rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;

# Connection limiting
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 10;
```

### Limites de Connexions
```typescript
// Node.js
const server = http.createServer();
server.maxConnections = 100;

// Express
app.use((req, res, next) => {
  // Check connection count
  if (getConnectionCount() >= MAX_CONNECTIONS) {
    return res.status(503).send('Service Unavailable');
  }
  next();
});
```

### Timeouts
```typescript
// Request timeout (Express)
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).send('Request timeout');
  });
  next();
});

// Server timeout
const server = app.listen(3000);
server.setTimeout(30000); // 30 seconds
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
```

---

## Précautions

**IMPORTANT** : Testez toujours contre des environnements de développement ou de staging. N'exécutez jamais de tests DDoS ou de stress contre des systèmes de production sans :
1. Autorisation écrite
2. Fenêtre de maintenance planifiée
3. Monitoring en place
4. Plan de retour prêt

---

## Références

- [OWASP Denial of Service](https://owasp.org/www-community/attacks/Denial_of_Service)
- [Slowloris Attack](https://en.wikipedia.org/wiki/Slowloris_(computer_security))
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Vegeta Documentation](https://vegeta.readthedocs.io/)
- [HTTP Load Testing (hey)](https://github.com/rakyll/hey)

---

*Généré par Guardian v0.6.0*
