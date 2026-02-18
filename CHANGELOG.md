# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-02-18

### Security

- **CRITICAL**: Fixed command injection vulnerability by replacing execSync with spawn()
- Added comprehensive input validation (URL, path, Docker name)
- Added SSRF protection with blocked hostnames and private IP ranges
- Added path traversal protection
- All Docker commands now use array arguments instead of string interpolation

### Added

- Complete testing infrastructure with Vitest
  - Unit tests for CLI, validation, Docker wrapper
  - Security-specific tests (command injection, path traversal)
  - 80% coverage threshold
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

## [1.0.1-alpha] - 2025-02-09

### Changed

- Updated README with simplified container naming
- Standardized container references globally

### Added

- MIT License

### Fixed

- Static container name `guardian-tools` used consistently across all operations

### Documentation

- Improved README with clear quick start guide
- Added production mode usage examples
- Comprehensive troubleshooting section
- Included tools list with categories
- Added safety warnings and best practices

[1.0.1-alpha]: https://github.com/Pamacea/guardian/releases/tag/v1.0.1-alpha

## [1.0.0] - 2025-02-09

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

[1.0.0]: https://github.com/Pamacea/guardian/releases/tag/v1.0.0
