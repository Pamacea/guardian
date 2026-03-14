# NestJS Security Scanner - Documentation

**Version:** v0.6.0
**Framework:** NestJS
**Scanner:** `bin/scanners/nestjs.js`

---

## Overview

Le scanner NestJS de Guardian effectue des tests de sécurité spécifiques aux applications construites avec le framework NestJS. Il détecte les vulnérabilités courantes liées aux guards, pipes, intercepteurs et autres fonctionnalités uniques de NestJS.

---

## Détection

Le scanner est activé automatiquement lorsque Guardian détecte une application NestJS via:

- **Dépendances:** `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`
- **Fichiers caractéristiques:**
  - `src/main.ts`
  - `src/app.module.ts`
  - `nest-cli.json`
  - `tsconfig.json`
- **Structure de dossier:** `src/` avec `controllers/`, `services/`, `guards/`, `pipes/`

---

## Vulnérabilités Détectées

### 1. Guard Bypass (HIGH)

Les guards NestJS protègent les routes, mais peuvent être contournés si mal configurés.

**Tests effectués:**
- Accès aux routes admin sans authentification
- Accès aux endpoints API sensibles
- Exposition des endpoints de configuration

**Example de vulnérabilité:**
```typescript
// ❌ VULNÉRABLE - Guard mal appliqué
@Controller('admin')
export class AdminController {
  @Get()
  @UseGuards(AuthGuard)  // Guard seulement sur cette route
  getAdmin() {
    return { data: 'sensitive' };
  }

  @Get('users')  // Pas de guard!
  getUsers() {
    return { users: [...] };
  }
}

// ✅ SÉCURISÉ - Guard au niveau du contrôleur
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  @Get()
  getAdmin() {
    return { data: 'sensitive' };
  }
}
```

**Recommandation:**
- Appliquer les guards au niveau du contrôleur ou du module global
- Vérifier l'ordre des guards
- Tester tous les endpoints protégés

---

### 2. Pipe Injection (CRITICAL)

Les pipes de validation NestJS peuvent être vulnérables aux injections si mal utilisés.

**Types d'injection détectés:**

#### SQL Injection
```bash
# Test
GET /api/search?q=' OR '1'='1

# Vulnérable si
ParseIntPipe utilisé sans validation SQL
```

#### NoSQL Injection
```bash
# Test
GET /api/users?query={"$ne":null}

# Vulnérable si
MongoDB avec query directe sans sanitize
```

#### Template Injection (SSTI)
```bash
# Test
GET /api/search?q={{7*7}}

# Vulnérable si
Rendu template avec input utilisateur
```

#### Path Traversal
```bash
# Test
GET /api/files?path=../../../etc/passwd

# Vulnérable si
Pas de validation du chemin
```

**Example de vulnérabilité:**
```typescript
// ❌ VULNÉRABLE - Pas de validation d'injection
@Controller('search')
export class SearchController {
  @Get()
  search(@Query('q') query: string) {
    return this.service.search(query);  // Query passée directement
  }
}

// ✅ SÉCURISÉ - Pipe de validation
@Controller('search')
export class SearchController {
  @Get()
  search(
    @Query('q', new ValidationPipe({ whitelist: true })) query: string
  ) {
    return this.service.search(escapeSql(query));
  }
}
```

**Recommandation:**
- Utiliser `ValidationPipe` avec `whitelist: true`
- Sanitizer les inputs avant utilisation
- Utiliser des requêtes paramétrées pour SQL
- Valider les chemins de fichiers

---

### 3. GraphQL Introspection (MEDIUM)

L'introspection GraphQL révèle la structure complète du schéma.

**Test effectué:**
```graphql
{
  __schema {
    types {
      name
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

**Example de vulnérabilité:**
```typescript
// ❌ VULNÉRABLE - Introspection activée
GraphQLModule.forRoot({
  autoSchemaFile: true,
  // Pas de restriction d'introspection
})

// ✅ SÉCURISÉ - Introspection désactivée en prod
GraphQLModule.forRoot({
  autoSchemaFile: true,
  introspection: false,
  playground: false,
})
```

**Recommandation:**
- Désactiver l'introspection en production
- Utiliser Apollo Server avec `introspection: false`
- Désactiver GraphQL Playground en prod

---

### 4. GraphQL DoS (MEDIUM)

Attaques par déni de service via requêtes GraphQL complexes.

**Types d'attaques détectées:**

#### Batch Query DoS
```graphql
{
  user0: user(id: 0) { id email }
  user1: user(id: 1) { id email }
  ... # 100 requêtes en une
}
```

#### Deep Nesting DoS
```graphql
{
  user(id: 1) {
    friends {
      friends {
        friends {
          friends {
            id
          }
        }
      }
    }
  }
}
```

**Example de protection:**
```typescript
// ✅ SÉCURISÉ - Limites configurées
GraphQLModule.forRoot({
  autoSchemaFile: true,
  validationRules: [
    queryComplexity(1000),
    depthLimit(5),
  ],
})
```

**Recommandation:**
- Configurer `queryComplexityLimit`
- Configurer `depthLimit`
- Limiter le batch queries

---

### 5. WebSocket Authentication Bypass (HIGH)

Les gateways WebSocket NestJS peuvent accepter des connexions non authentifiées.

**Tests effectués:**
- Upgrade WebSocket sans token
- Connexion via `/ws`
- Connexion via `/socket.io/`
- Connexion via `/gateway`

**Example de vulnérabilité:**
```typescript
// ❌ VULNÉRABLE - Pas d'auth WebSocket
@WebSocketGateway()
export class ChatGateway {
  @SubscribeMessage('message')
  handleMessage(client: Socket, data: any) {
    // Pas de vérification d'authentification
    return this.service.sendMessage(data);
  }
}

// ✅ SÉCURISÉ - Auth WebSocket
@WebSocketGateway()
export class ChatGateway {
  constructor(private authService: AuthService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    const user = await this.authService.validateToken(token);
    if (!user) {
      client.disconnect();
      return;
    }
    client.data.user = user;
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, data: any) {
    if (!client.data.user) {
      return { error: 'Unauthorized' };
    }
    return this.service.sendMessage(client.data.user, data);
  }
}
```

**Recommandation:**
- Implémenter l'authentification dans `handleConnection`
- Vérifier le token JWT dans le handshake
- Utiliser `@UseGuards` sur les events sensibles

---

### 6. Throttler Bypass (MEDIUM)

Le module `@nestjs/throttler` peut être contourné si mal configuré.

**Test effectué:**
- 100 requêtes rapides sur un endpoint limité
- Vérification du taux de blocage

**Example de vulnérabilité:**
```typescript
// ❌ VULNÉRABLE - Throttler par défaut trop permissif
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 1000,  // Trop élevé
})

// ✅ SÉCURISÉ - Limites strictes
ThrottlerModule.forRoot({
  ttl: 60,
  limit: 10,  // Plus strict
  skipIf: () => false,  // Ne jamais skip
})
```

**Recommandation:**
- Configurer des limites adaptées aux endpoints
- Utiliser `@Throttle()` par endpoint
- Ne jamais skipper le throttler en production

---

### 7. CORS Misconfiguration (MEDIUM)

Configuration CORS trop permissive.

**Tests effectués:**
- Origin: `evil.com`
- Origin: `malicious-site.com`
- Origin: `null`

**Example de vulnérabilité:**
```typescript
// ❌ VULNÉRABLE - CORS trop permissif
app.enableCors({
  origin: '*',  // N'importe quel origin
  credentials: true,  // Dangereux avec *
})

// ✅ SÉCURISÉ - CORS restreint
app.enableCors({
  origin: [
    'https://myapp.com',
    'https://admin.myapp.com',
  ],
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

**Recommandation:**
- Spécifier les origines autorisées explicitement
- Éviter `origin: '*'` avec `credentials: true`
- Limiter les méthodes et headers autorisés

---

### 8. Missing Security Headers (LOW)

Headers de sécurité manquants.

**Headers vérifiés:**
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`
- `X-XSS-Protection`
- `Referrer-Policy`

**Example de protection:**
```typescript
// ✅ SÉCURISÉ - Helmet
import helmet from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  await app.listen(3000);
}
```

**Recommandation:**
- Utiliser le middleware `helmet`
- Configurer CSP selon les besoins
- Activer HSTS en HTTPS

---

## Templates Nuclei

Les templates Nuclei suivants sont disponibles dans `nuclei-templates/nestjs/`:

| Template | Description | Sévérité |
|----------|-------------|----------|
| `guard-bypass.yaml` | Guard bypass detection | HIGH |
| `pipe-injection.yaml` | Pipe injection (SQLi, NoSQLi, SSTI) | CRITICAL |
| `graphql-introspection.yaml` | GraphQL introspection enabled | MEDIUM |
| `graphql-dos.yaml` | GraphQL batch query DoS | HIGH |
| `websocket-auth.yaml` | WebSocket auth bypass | HIGH |
| `throttler-bypass.yaml` | Rate limiting bypass | MEDIUM |
| `cors-misconfig.yaml` | CORS misconfiguration | MEDIUM |
| `security-headers.yaml` | Missing security headers | LOW |
| `ssti-detection.yaml` | Server-side template injection | CRITICAL |

---

## Utilisation

### Scan complet
```bash
guardian scan /path/to/nestjs/app
```

### Scan avec options
```bash
guardian scan /path/to/nestjs/app \
  --target http://localhost:3000 \
  --container guardian-tools
```

### Résultat JSON
```json
{
  "framework": "nestjs",
  "version": "10.0.0",
  "checks": [
    {
      "name": "Guard Bypass Check",
      "status": "failed",
      "vulnerabilities": [
        {
          "severity": "HIGH",
          "title": "Guard Bypass",
          "description": "Admin route accessible without authentication",
          "endpoint": "GET /admin"
        }
      ]
    }
  ],
  "vulnerabilities": [...]
}
```

---

## Docker Commands

```bash
# NestJS-specific scan
docker exec guardian-tools nuclei -u http://host.docker.internal:3000 \
  -t nuclei-templates/nestjs/ -severity high,critical

# GraphQL testing
docker exec guardian-tools graphqlmap http://host.docker.internal:3000/graphql

# Test guards
docker exec guardian-tools httpie GET http://host.docker.internal:3000/admin
```

---

## Checklist de Sécurité NestJS

- [ ] Guards appliqués au niveau contrôleur/module
- [ ] ValidationPipe avec whitelist activé
- [ ] Sanitization des inputs utilisateur
- [ ] GraphQL introspection désactivée en prod
- [ ] Limites de complexité GraphQL configurées
- [ ] WebSocket auth implémentée
- [ ] Throttler configuré avec limites strictes
- [ ] CORS restreint aux origines autorisées
- [ ] Helmet middleware activé
- [ ] Variables d'environnement validées
- [ ] Secrets non exposés dans les logs
- [ ] Error handling ne révèle pas d'infos sensibles

---

## Références

- [NestJS Security Best Practices](https://docs.nestjs.com/security)
- [OWASP NestJS Cheat Sheet](https://cheatsheetseries.owasp.org/)
- [GraphQL Security](https://graphql.org/learn/best-practices/#security)

---

*Généré par Guardian v0.6.0*
