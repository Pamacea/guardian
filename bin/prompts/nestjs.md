# NestJS Security Review Prompt

## Contexte

Vous effectuez un audit de sécurité d'une application **NestJS**. Utilisez les méthodes et outils spécifiques à NestJS pour identifier les vulnérabilités.

## Détection NestJS

L'application est identifiée comme NestJS par:
- `nest-cli.json` présent
- `@nestjs/core` dans package.json
- `NestFactory.create` dans src/main.ts
- Fichiers `.module.ts`, `.controller.ts`, `.service.ts`, `.guard.ts`, `.pipe.ts`

## Vulnérabilités Spécifiques NestJS

### 1. Guard Bypass

**Description:** Les guards NestJS peuvent être contournés si mal configurés.

**Tests:**
```bash
# Accès aux routes protégées sans auth
docker exec guardian-tools httpie GET http://host.docker.internal:3000/admin
docker exec guardian-tools httpie GET http://host.docker.internal:3000/api/users
docker exec guardian-tools httpie GET http://host.docker.internal:3000/api/config

# Cherchez les routes sensibles
docker exec guardian-tools ffuf -u http://host.docker.internal:3000/FUZZ \
  -w /wordlists/common.txt -mc all -fc 404
```

**Indicateurs de vulnérabilité:**
- Routes admin accessibles sans token
- Guards manquants sur les endpoints sensibles
- Utilisation de `@UseGuards()` sansAuthGuard personnalisé

**Correction:**
```typescript
// Implementer un guard global + des guards spécifiques
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return validateToken(request.headers.authorization);
  }
}

// Appliquer sur le contrôleur
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {}
```

### 2. Pipe Injection

**Description:** Les pipes de validation peuvent être contournés pour injecter des données malveillantes.

**Tests:**
```bash
# SQL Injection via pipe
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:3000/api/search?query=' OR 1=1--"

# NoSQL Injection
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:3000/api/search?query={\"\$ne\": null}"

# Template Injection
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:3000/api/search?query={{7*7}}"

# Path Traversal
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:3000/api/files?path=../../../etc/passwd"
```

**Indicateurs de vulnérabilité:**
- Pas de validation sur les paramètres de requête
- Utilisation de `@Body()` sans `@UsePipes(ValidationPipe)`
- Erreurs de base de données retournées au client

**Correction:**
```typescript
// Toujours utiliser ValidationPipe avec class-validator
export class SearchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s]+$/)
  query: string;
}

@Get('search')
async search(@Query() dto: SearchDto) {
  // dto est validé automatiquement
}
```

### 3. GraphQL NestJS

**Description:** GraphQL dans NestJS a des vulnérabilités spécifiques.

**Tests:**
```bash
# Introspection
docker exec guardian-tools httpie POST \
  http://host.docker.internal:3000/graphql \
  body='{"query":"{ __schema { types { name } } }"}'

# Batch Query DoS
docker exec guardian-tools httpie POST \
  http://host.docker.internal:3000/graphql \
  body='{"query":"{ user1: user(id:1) { email } user2: user(id:2) { email } ... }"}'

# Deep Nesting DoS
docker exec guardian-tools httpie POST \
  http://host.docker.internal:3000/graphql \
  body='{"query":"{ user { friends { friends { friends { friends { id } } } } } }"}'
```

**Indicateurs de vulnérabilité:**
- Introspection activée en production
- Pas de limites sur la profondeur des requêtes
- Pas de limites sur le nombre de requêtes batch

**Correction:**
```typescript
// Désactiver l'introspection en production
GraphQLModule.forRoot({
  playground: false,
  introspection: false,
  complexity: { ... },
  validationRules: [
   限制复杂度规则
  ]
})
```

### 4. WebSocket Authentication

**Description:** Les WebSocket NestJS peuvent manquer d'authentification.

**Tests:**
```bash
# Essayer de se connecter sans auth
docker exec guardian-tools curl -s -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  http://host.docker.internal:3000/
```

**Indicateurs de vulnérabilité:**
- Connexion WebSocket acceptée sans authentification
- Pas de validation des messages WebSocket

**Correction:**
```typescript
@WebSocketGateway({
  path: 'ws',
  cors: { origin: false }
})
export class MyGateway implements OnGatewayConnection {
  handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    if (!validateToken(token)) {
      client.disconnect();
    }
  }
}
```

### 5. Throttler Bypass

**Description:** Le throttler NestJS peut être contourné.

**Tests:**
```bash
# Envoyer 100 requêtes rapidement
for i in {1..100}; do
  docker exec guardian-tools httpie GET http://host.docker.internal:3000/api/limited
done

# Essayer avec différents headers
docker exec guardian-tools httpie GET http://host.docker.internal:3000/api/limited \
  X-Forwarded-For: 127.0.0.1

docker exec guardian-tools httpie GET http://host.docker.internal:3000/api/limited \
  X-Real-IP: 127.0.0.1
```

**Indicateurs de vulnérabilité:**
- Plus de 50 requêtes réussies sur 100
- Bypass via X-Forwarded-For ou X-Real-IP

**Correction:**
```typescript
// Configurer le throttler correctement
ThrottlerModule.forRoot({
  ttl: 60000,
  limit: 10,
  ignoreUserAgents: []
})

// Utiliser l'IP réelle du client
@UseGuards(ThrottlerGuard)
@Throttle(10, 60)
@Get('limited')
async limited() {
  return 'rate limited';
}
```

### 6. ORM Injection (TypeORM/Prisma)

**Description:** Les injections via les ORM NestJS.

**Tests:**
```bash
# TypeORM injection
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:3000/api/users?id=1' OR '1'='1"

# Prisma injection
docker exec guardian-tools httpie GET \
  "http://host.docker.internal:3000/api/posts?where={\"email\":{\"contains\":\"@\"}}"
```

**Indicateurs de vulnérabilité:**
- Concaténation de chaînes dans les requêtes
- Utilisation de `QueryBuilder` sans paramètres
- Erreurs SQL retournées au client

**Correction:**
```typescript
// Toujours utiliser les paramètres
async findById(id: string) {
  return this.userRepository.findOne({
    where: { id } // TypeORM échappe automatiquement
  });
}

// Pour les requêtes complexes
async search(query: string) {
  return this.userRepository
    .createQueryBuilder('user')
    .where('user.name LIKE :query', { query: `%${query}%` })
    .getMany();
}
```

## Commandes Docker pour NestJS

```bash
# Scanner les guards
docker exec guardian-tools nuclei -u http://host.docker.internal:3000 \
  -t nuclei-templates/nestjs/ -severity high,critical

# Test XSS
docker exec guardian-tools dalfox url \
  "http://host.docker.internal:3000/search?q=test"

# Test JWT
docker exec guardian-tools jwt_tool \
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -A

# Test les headers de sécurité
docker exec guardian-tools httpie GET \
  http://host.docker.internal:3000 --print=h
```

## Checklist NestJS

- [ ] Guards implémentés sur tous les endpoints sensibles
- [ ] ValidationPipe configuré globalement
- [ ] GraphQL introspection désactivée en prod
- [ ] WebSocket authentification implémentée
- [ ] Throttler configuré avec limites strictes
- [ ] ORM utilisé avec paramètres (pas de concaténation)
- [ ] JWT configuré avec expiration et verification
- [ ] CORS configuré avec origins explicites
- [ ] Security headers via helmet
- [ ] Environment variables via @nestjs/config
