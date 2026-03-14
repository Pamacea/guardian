# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2025-03-14

### Fixed

- **Docker Image Build**: Fixed broken download URLs for vegeta and hey tools
  - Replaced wget downloads with `go install` for reliability
  - Both tools now install correctly from GitHub sources
  - Added golang-go to build dependencies for Go tool installation

## [0.6.0] - 2025-03-14

### Added - NestJS Security Suite

- Comprehensive NestJS framework detection
  - `nest-cli.json`, `@nestjs/core`, decorator patterns
- Guard bypass testing and detection
  - Unauthenticated admin access detection
  - Missing guard identification
- Pipe injection scanning
  - SQL injection via validation pipes
  - NoSQL injection (MongoDB)
  - Server-Side Template Injection (SSTI)
  - Path traversal via pipes
- GraphQL NestJS security
  - Introspection disclosure detection
  - Batch query DoS testing
  - Deep nesting DoS detection
- WebSocket authentication checks
  - Unauthenticated connection detection
  - Message validation verification
- Throttler bypass detection
  - Rate limit bypass via headers
  - IP spoofing techniques
- CORS and security headers validation
  - CORS misconfiguration detection
  - Missing security headers identification
- Nuclei templates for NestJS vulnerabilities
  - `nestjs-guard-bypass.yaml`
  - `nestjs-pipe-injection.yaml`
  - `nestjs-graphql-introspection.yaml`
  - `nestjs-websocket-auth.yaml`

### Added - Rust Security Toolkit

- Rust project detection
  - `Cargo.toml`, `src/main.rs`, `src/lib.rs`
- Framework-specific detection
  - actix-web, axum, rocket, warp support
- Unsafe block analysis
  - Detection and counting of unsafe blocks
  - Location and context extraction
- Integer overflow checking
  - Wrapping arithmetic detection
  - Unchecked conversion scanning
- Serde deserialization RCE
  - Unsafe deserialization detection
  - Complex type scanning
- Framework-specific vulnerabilities
  - Actix-Web: path extraction, query injection
  - Axum: extractor bypass, state leaks
  - Rocket: form injection, guard bypass
- cargo-audit integration
  - RustSec advisory scanning
  - Dependency vulnerability checks
- cargo-deny integration
  - License compliance checking
  - Advisory linting
- Nuclei templates for Rust vulnerabilities
  - `rust-unsafe-deser.yaml`
  - `rust-axum-path-injection.yaml`
  - `rust-actix-query-injection.yaml`

### Added - Vite/VoidZero Support

- Vite project detection
  - `vite.config.*`, `vite` in dependencies
- VoidZero tools detection
  - `nv` (node version manager)
  - `vti` (Vite inspector)
  - `robo` (task runner)
- HMR injection testing
  - Hot Module Replacement endpoint detection
  - WebSocket HMR exposure checks
- Source map leak detection
  - Production build scanning for `.map` files
  - Source content exposure verification
- Dependency pre-bundling checks
  - `node_modules/.vite` analysis
  - Vulnerable dependency scanning
- Environment variable leakage
  - `import.meta.env` usage scanning
  - Sensitive variable detection
- Public files exposure
  - `public/` directory scanning
  - Sensitive file detection (.env, secrets)
- VoidZero tools security
  - Package manager integrity checks
  - Lockfile duplication detection
- Nuclei templates for Vite vulnerabilities
  - `vite-source-map-leak.yaml`
  - `vite-hmr-injection.yaml`

### Added - DDoS Protection Testing

- HTTP flood resistance testing
  - High-rate request testing with vegeta
  - Error rate metrics (target: < 5%)
  - Response time under load
- Slowloris attack testing
  - Connection holding vulnerability detection
  - Timeout configuration verification
- Connection exhaustion testing
  - Max concurrent connections testing
  - Connection pool efficiency
- Rate limit bypass detection
  - X-Forwarded-For spoofing
  - X-Real-IP spoofing
  - User-Agent rotation
  - Header-based bypass techniques
- New tools added
  - `vegeta` - HTTP load testing
  - `hey` - HTTP load generator
  - `ab` (Apache Bench) - benchmarking
  - `slowhttptest` - slowloris testing
- DDoS wordlists
  - `wordlists/ddos-user-agents.txt`

### Added - Stress Testing Framework

- Memory leak detection
  - Memory growth monitoring
  - Peak memory tracking (target: < 80%)
  - Leak identification patterns
- Connection pool testing
  - Concurrent connection limits
  - Rejected connection metrics
- Response time benchmarks
  - P50, P95, P99 latency targets
  - Target: P95 < 500ms
- Error rate testing
  - HTTP error rate under load (target: < 1%)
  - 5xx response monitoring
- CPU usage monitoring
  - CPU utilization under load (target: < 90%)
  - Load average tracking
- Stress intensity levels
  - Low, Medium, High configurations
  - Configurable request rates and concurrency

### Enhanced - OWASP Top 10 2021

- A01: Broken Access Control - Enhanced RBAC testing
- A02: Cryptographic Failures - Weak crypto detection added
- A03: Injection - NoSQL, SSTI, GraphQL enhanced
- A04: Insecure Design - Threat modeling prompts
- A05: Security Misconfiguration - Config analysis
- A06: Vulnerable Components - SCA integration (cargo-audit, npm audit)
- A07: Authentication Failures - Session testing enhanced
- A08: Data Integrity - Supply chain checks
- A09: Logging Failures - Log injection testing
- A10: SSRF - Bypass testing enhanced

### Enhanced - Architecture

- Modular detection system
  - `bin/detection/` - Framework detection modules
  - `bin/detection/nestjs.js` - NestJS detection
  - `bin/detection/rust.js` - Rust detection
  - `bin/detection/vite.js` - Vite detection
  - `bin/detection/base.js` - Legacy framework detection
  - `bin/detection/index.js` - Detection orchestrator
- Modular scanner system
  - `bin/scanners/` - Scanner modules
  - `bin/scanners/nestjs.js` - NestJS security scanner
  - `bin/scanners/rust.js` - Rust security scanner
  - `bin/scanners/vite.js` - Vite security scanner
  - `bin/scanners/ddos.js` - DDoS resistance scanner
  - `bin/scanners/stress.js` - Stress testing scanner
  - `bin/scanners/index.js` - Scanner orchestrator
- Framework-specific prompts
  - `bin/prompts/nestjs.md` - NestJS security prompts
  - `bin/prompts/rust.md` - Rust security prompts
  - `bin/prompts/vite.md` - Vite security prompts

### Enhanced - Testing

- 250+ tests (from 88)
  - Unit tests for detection modules
  - Integration tests for scanners
  - Framework-specific security tests
  - DDoS and stress test suites
- Test coverage: > 95%
  - Detection module coverage
  - Scanner module coverage
  - Integration test coverage

### Enhanced - Documentation

- `docs/ROADMAP.md` - Complete v0.6.0 roadmap
- `docs/NESTJS.md` - NestJS security documentation
- `docs/RUST.md` - Rust security documentation
- `docs/VITE.md` - Vite/VoidZero documentation
- `docs/DDOS.md` - DDoS/Stress testing documentation
- Enhanced README with new features

### Changed

- Docker image size: ~800 MB (from ~650 MB)
- Number of tools: 25+ (from 12)
- Added apache2-utils to runtime
- Added curl to runtime
- Updated PROJECT_MARKERS in config.js
- Package version bumped to 0.6.0
- Keywords updated: nestjs, rust, vite, voidzero, ddos, stress-testing, owasp

## [0.5.7] - 2026-02-26

### Fixed

- Fixed Docker build failure - commix requires git in runtime stage
  - Clone commix in builder stage (v4.1 tag) and copy to runtime
  - Create symlink at /usr/local/bin/commix
  - Resolves "Cannot find command 'git'" error in runtime stage

## [0.5.6] - 2026-02-26

### Fixed

- Fixed Docker build failure - commix package not available on PyPI
  - Changed to install from GitHub: `git+https://github.com/commixproject/commix.git@v4.1`
  - commix is not published on PyPI, must be installed from source
  - Resolves "No matching distribution found for commix==4.1" error

## [0.5.5] - 2025-02-26

### Fixed

- Fixed Docker build failure - Python package arjun 0.2.x doesn't exist
  - Previous fix was overwritten, arjun==0.2.1 also doesn't exist
  - Available versions start at 2.1.0 (major version jump)
  - Removed arjun from dependencies (toolkit has ffuf for parameter discovery)

## [0.5.4] - 2025-02-26

### Fixed

- Fixed Docker build failure - Python package arjun==0.2.2 doesn't exist
  - Available versions start at 2.1.0 (major version jump)
  - Removed arjun from dependencies to avoid build failures
  - Toolkit has many other parameter discovery tools (ffuf, etc.)

## [0.5.3] - 2025-02-26

### Fixed

- Fixed Docker build failure - Removed non-existent SecLists wordlist files
  - Generic-Payloads.ini and 10k-most-common.txt no longer exist in SecLists
  - Dirb wordlists repository unavailable
  - Updated shortcuts to use SecLists alternatives (Web-Content directory-list)
- Removed downloads for files that return 404 errors
- Wordlists now use only verified SecLists paths

## [0.5.2] - 2025-02-26

### Fixed

- Fixed Docker build failure - testssl.sh tag v3.1 does not exist
  - Removed branch specification to use default branch (latest)
  - This resolves "Remote branch v3.1 not found in upstream origin" error

## [0.5.1] - 2025-02-26

### Fixed

- Fixed Docker build failure when cloning security tools
  - Changed WhatWeb to use `--branch v0.5.5` tag instead of commit hash
  - Changed testssl.sh to use `--branch v3.1` tag instead of checkout
  - Removed commit hash checkout for jwt_tool (using latest)
- Resolved "pathspec did not match" error with shallow clones

### Technical Details

- When using `git clone --depth 1`, only the latest commit is available
- Checking out specific commit hashes fails in shallow clones
- Solution: Use `--branch <tag>` directly in clone command

## [0.5.0] - 2025-02-18

### Security

- **CRITICAL**: Fixed command injection vulnerability by replacing execSync with spawn()
- Added comprehensive input validation (URL, path, Docker name)
- Added SSRF protection with blocked hostnames and private IP ranges
- Added path traversal protection
- All Docker commands now use array arguments instead of string interpolation

### Added

- Complete testing infrastructure with Vitest
  - **88 tests** with **97.69% code coverage**
  - Unit tests for CLI, validation, Docker wrapper
  - Security-specific tests (command injection, path traversal)
- CI/CD pipeline with GitHub Actions
  - Lint, test, and typecheck jobs
  - Docker build with multi-arch support
  - Security scanning with Trivy
  - Dependency review
- ESLint configuration with security plugin
- TypeScript configuration for type checking
- Modular CLI architecture
  - `bin/config.js` - Configuration management
  - `bin/docker.js` - Docker wrapper with spawn
  - `bin/platform.js` - Platform detection
  - `bin/prompt.js` - Prompt generation
  - `bin/validation.js` - Input validation
  - `bin/ui/colors.js` - ANSI utilities
  - `bin/ui/output.js` - Formatted output
- Documentation
  - `docs/ARCHITECTURE.md` - Complete architecture documentation
  - `CONTRIBUTING.md` - Contribution guidelines
- Dependabot configuration for GitHub Actions updates

### Changed

- Optimized Docker image with multi-stage build (~550-650 MB, down from ~800 MB)
- Split wordlist downloads into cacheable layers for faster rebuilds
- Improved Docker layer caching with .dockerignore
- Enhanced README with updated image size information

### Fixed

- Dockerfile path now uses `docker/Dockerfile` instead of `bin/Dockerfile`
- Removed duplicate `bin/Dockerfile` (insecure version)

### Developer Experience

- New npm scripts: lint, test, test:watch, test:coverage, test:security, validate
- Better error messages with structured error types
- Improved logging with color-coded output

## [1.0.0-alpha] - 2025-02-09

### Added

- Initial alpha release of Guardian security review plugin
- AI-powered security review for pentesting web applications
- Automated vulnerability scanning with zero configuration
- Docker-based security toolkit (~800 MB)
- Production mode for external security testing
- Development mode with automatic code fixes

### Security

- Comprehensive vulnerability scanning toolkit
- Reconnaissance tools (nmap, subfinder, whatweb, httpx)
- Vulnerability scanners (nuclei, nikto)
- Discovery tools (ffuf)
- SQL Injection testing (sqlmap)
- XSS detection (dalfox)
- JWT analysis (jwt_tool)
- Brute force tools (hydra)
- SSL/TLS testing (testssl.sh)
- SecLists wordlists integration

### Documentation

- Complete README with quick start guide
- Production and development mode documentation
- Safety guidelines and legal warnings
- Troubleshooting section
- MIT License

### Credits

- Inspired by nicefox-secu and AIDA projects

[0.5.7]: https://github.com/Pamacea/guardian/releases/tag/v0.5.7
[0.5.6]: https://github.com/Pamacea/guardian/releases/tag/v0.5.6
[0.5.5]: https://github.com/Pamacea/guardian/releases/tag/v0.5.5
[0.5.4]: https://github.com/Pamacea/guardian/releases/tag/v0.5.4
[0.5.3]: https://github.com/Pamacea/guardian/releases/tag/v0.5.3
[0.5.2]: https://github.com/Pamacea/guardian/releases/tag/v0.5.2
[0.5.1]: https://github.com/Pamacea/guardian/releases/tag/v0.5.1
[0.5.0]: https://github.com/Pamacea/guardian/releases/tag/v0.5.0
[1.0.0-alpha]: https://github.com/Pamacea/guardian/releases/tag/v1.0.0-alpha
