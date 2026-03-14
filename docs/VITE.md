# Vite/VoidZero Security Documentation

## Overview

Guardian provides comprehensive security testing for Vite applications and VoidZero tools.

## Detection

Guardian automatically detects Vite projects by:
- `vite.config.js` or `vite.config.ts` presence
- `vite` in package.json
- Dev scripts with `vite`
- `.vite` directory

VoidZero tools are detected by:
- `nv` (node version manager) in devDependencies
- `vti` (Vite inspector) in devDependencies
- `robo` (task runner) in devDependencies
- `nm` (Node manager) in devDependencies
- `.nvrc` configuration file

## Vulnerabilities Tested

### Development Server
- **HMR Injection**: Hot Module Replacement exploits
- **Dev Server CORS**: Overly permissive CORS in dev mode
- **WebSocket Exposure**: HMR WebSocket accessible

### Build Artifacts
- **Source Map Leaks**: Source maps exposed in production
- **Build Configuration**: Missing production optimizations
- **Public Files**: Sensitive files in public directory

### Dependencies
- **Pre-bundling Vulnerabilities**: Vite's dependency pre-bundling issues
- **npm Audit**: Dependency vulnerabilities
- **Lockfile Integrity**: Multiple lockfiles detected

### Environment Variables
- **Client-Side Secrets**: import.meta.env leaks
- **Server Variable Exposure**: Sensitive env vars in client code
- **VITE_ Prefix Violation**: Non-prefixed variables exposed

### VoidZero Tools
- **nv Integrity**: Version spoofing detection
- **vti Information Leak**: Inspector exposure in production
- **robo Task Injection**: Task runner command injection
- **Multiple Lockfiles**: Conflicting package managers

## Nuclei Templates

Guardian includes specialized Nuclei templates for Vite/VoidZero:

| Template | Description | Severity |
|----------|-------------|----------|
| `vite-source-map-leak.yaml` | Source map detection | medium |
| `vite-hmr-websocket-exposure.yaml` | HMR WebSocket exposure | low |
| `vite-hmr-client-exposure.yaml` | HMR client endpoint | low |
| `vite-env-var-leak.yaml` | Environment variable leaks | medium |
| `vite-dev-server-detection.yaml` | Dev server in production | info |
| `vite-public-files-exposure.yaml` | Sensitive files in public/ | high |
| `vite-cors-misconfig.yaml` | CORS misconfiguration | low |
| `voidzero-vti-exposure.yaml` | VTI inspector exposure | medium |
| `voidzero-nv-version-spoof.yaml` | Node version spoofing | info |

## Usage

```bash
# Run Guardian on Vite project
npx @oalacea/guardian

# AI will detect Vite and run specific tests
```

## Docker Commands

```bash
# Check source maps
docker exec guardian-tools find /app/dist -name "*.map"

# Test HMR endpoint
docker exec guardian-tools httpie GET http://host.docker.internal:5173/@vite/client

# Check env vars in bundle
docker exec guardian-tools sh -c 'grep -r "import.meta.env" /app/dist/assets/'

# Audit dependencies
docker exec guardian-tools npm audit --json
```

## Remediation

### Source Map Protection
```javascript
// vite.config.js
export default defineConfig({
  build: {
    sourcemap: process.env.NODE_ENV === 'development'
  }
});
```

### Environment Variable Safety
```javascript
// ONLY prefix with VITE_ for public variables
// ❌ BAD: Secret exposed to client
const API_KEY = import.meta.env.SECRET_KEY;

// ✅ GOOD: Public variable
const API_URL = import.meta.env.VITE_API_URL;

// ✅ GOOD: Secret on server only
const API_KEY = await fetch('/api/config');
```

### HMR Protection (Production)
```javascript
// Ensure HMR is disabled in production
export default defineConfig({
  server: {
    hmr: process.env.NODE_ENV === 'development'
  }
});
```

### CORS Configuration
```javascript
// Explicit origins only
export default defineConfig({
  server: {
    cors: {
      origin: ['https://yourdomain.com'],
      credentials: true
    }
  }
});
```

### Public Directory Security
```
# Never put these in public/
- .env*
- config.json
- secrets.json
- *.key
- *.pem
```

## References

- [Vite Security](https://vitejs.dev/guide/build.html#production-mode)
- [VoidZero Tools](https://voidzero.dev/)
- [Source Map Security](https://javascript.info/source-maps#source-maps-in-production)
- [Vite HMR Security](https://github.com/vitejs/vite/security/advisories)

## VoidZero Tools Security

### NV (Node Version Manager)
```bash
# Check for version spoofing
cat .nvrc
cat .nvmrc

# Verify Node version
node --version
nv --version
```

### VTI (Vite Inspector)
```javascript
// NEVER enable inspector in production
// ❌ BAD
export default defineConfig({
  plugins: [
    inspector({
      open: true  // Always opens inspector
    })
  ]
})

// ✅ GOOD
export default defineConfig({
  plugins: [
    process.env.NODE_ENV === 'development'
      ? inspector()
      : null
  ].filter(Boolean)
})
```

### Robo (Task Runner)
```yaml
# robo.yaml - Avoid shell injection
# ❌ BAD
tasks:
  build:
    command: "npm run {{input}}"  # Shell injection!

# ✅ GOOD
tasks:
  build:
    command: "npm run build"
  test:
    command: "npm run test"
```
