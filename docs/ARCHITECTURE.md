# Guardian Architecture

## Overview

Guardian is an AI-powered security review CLI tool that orchestrates a Docker container containing comprehensive security testing tools.

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI (Node.js)                        │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐ │
│  │ Platform │  │   Docker   │  │  Prompt    │  │  Config │ │
│  │ Detect   │  │ Management │  │ Generator  │  │         │ │
│  └──────────┘  └────────────┘  └────────────┘  └─────────┘ │
│  ┌────────────┐  ┌────────────┐                            │
│  │ Validation │  │    UI      │                            │
│  │   Module   │  │  Output    │                            │
│  └────────────┘  └────────────┘                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Security Tools                      │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │  │
│  │  │   Recon    │ │  Scanning  │ │Exploitation│       │  │
│  │  │ nmap, sub  │ │ nuclei, ff │ │sqlmap,dalfo│       │  │
│  │  └────────────┘ └────────────┘ └────────────┘       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Wordlists                           │  │
│  │  /wordlists/common.txt, xss.txt, sqli.txt, etc.      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### CLI Modules

| Module | File | Responsibility |
|--------|------|-----------------|
| **Entry Point** | `bin/cli.js` | Orchestrates the workflow, delegates to modules |
| **Configuration** | `bin/config.js` | Manages app settings and constants |
| **Docker Wrapper** | `bin/docker.js` | Handles all Docker operations via spawn |
| **Platform Detection** | `bin/platform.js` | Detects OS and sets networking hints |
| **Prompt Generator** | `bin/prompt.js` | Creates AI prompts with context |
| **Validation** | `bin/validation.js` | Input validation (URL, path, SSRF protection) |
| **UI Output** | `bin/ui/output.js` | Formatted console output |
| **Colors** | `bin/ui/colors.js` | ANSI color utilities |

### Security Tools (Docker)

| Category | Tools | Purpose |
|----------|-------|---------|
| **Reconnaissance** | nmap, subfinder, whatweb, httpx | Port scanning, subdomains, tech fingerprinting |
| **Vulnerability Scanning** | nuclei, nikto | Known CVEs, web server misconfigurations |
| **Discovery** | ffuf | Directory and endpoint fuzzing |
| **SQL Injection** | sqlmap | Automated SQL injection testing |
| **XSS** | dalfox | Cross-site scripting detection |
| **JWT** | jwt_tool | JWT token analysis and exploitation |
| **Brute Force** | hydra | Authentication brute force |
| **SSL/TLS** | testssl.sh | SSL/TLS configuration analysis |
| **Utilities** | httpie | HTTP requests for manual testing |

### Wordlists

Located at `/wordlists/` inside the container:

- `common.txt` - Quick directory fuzzing
- `big.txt` - Larger directory list
- `xss.txt` - XSS payloads
- `sqli.txt` - SQL injection payloads
- `passwords.txt` - Top 10,000 passwords

## Data Flow

1. **User invokes CLI**: `npx @oalacea/guardian [url]`
2. **Platform Detection**: CLI detects Windows/macOS/Linux
3. **Docker Verification**:
   - Checks if Docker daemon is running
   - Builds image if missing (~800MB, first run only)
   - Starts container if not running
4. **Prompt Generation**:
   - Reads `prompt/REVIEW.md` template
   - Injects platform-specific networking hint
   - Adds context block (target URL, mode, source availability)
   - Writes to `.guardian/REVIEW.md` in user's project
5. **AI Agent Execution**:
   - AI reads `.guardian/REVIEW.md`
   - Auto-detects framework and target URL
   - Executes tools via `docker exec guardian-tools <command>`
   - Applies fixes directly to source code (dev mode)
   - Verifies each fix
6. **Summary**: AI reports findings count and fix status

## Platform-Specific Networking

Docker networking varies by platform. The prompt includes the appropriate hint:

| Platform | Container Network | Localhost Target |
|----------|-------------------|------------------|
| **Linux** | `--network=host` | `http://localhost:PORT` |
| **Windows** | bridge (default) | `http://host.docker.internal:PORT` |
| **macOS** | bridge (default) | `http://host.docker.internal:PORT` |

## Security Architecture

### Input Validation

All user inputs are validated through `bin/validation.js`:

- **URLs**: Checked for format, blocked hosts (SSRF protection)
- **Paths**: Validated for traversal attempts, null bytes
- **Docker Names**: Validated format, no shell metacharacters

### Command Execution

- All Docker commands use `spawn()` with array arguments
- No string interpolation that could lead to command injection
- Explicit error handling for all subprocess operations

### Container Security

- Non-root user (`guardian`, UID 1000)
- Minimal base image (`python:3.12-slim-bookworm`)
- Pinned tool versions for reproducibility

### Environment Modes

| Mode | Scope | Rules |
|------|-------|-------|
| **Development** | Local projects | Full tool access, can modify data, edit source code |
| **Production** | External URLs | Non-destructive only, conservative scanning, requires authorization |

## Extension Points

### Adding a New Tool

1. Add to `docker/Dockerfile` with version pin
2. Update `prompt/REVIEW.md` tool table
3. Update README.md tools list
4. Add integration test

### Adding a New Validation Rule

1. Add function to `bin/validation.js`
2. Export from module
3. Use in `bin/cli.js` or other modules
4. Add unit test in `tests/unit/validation.test.js`

## Testing Architecture

```
tests/
├── unit/              # Unit tests for individual modules
│   ├── cli.test.js
│   ├── validation.test.js
│   └── docker.test.js
├── integration/       # Cross-module tests
│   ├── workflow.test.js
│   └── tools.test.js
└── security/          # Security-specific tests
    ├── command-injection.test.js
    └── path-traversal.test.js
```

Coverage threshold: 80% (lines, functions, branches, statements)
