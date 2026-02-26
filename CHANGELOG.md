# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[0.5.4]: https://github.com/Pamacea/guardian/releases/tag/v0.5.4
[0.5.3]: https://github.com/Pamacea/guardian/releases/tag/v0.5.3
[0.5.2]: https://github.com/Pamacea/guardian/releases/tag/v0.5.2
[0.5.1]: https://github.com/Pamacea/guardian/releases/tag/v0.5.1
[0.5.0]: https://github.com/Pamacea/guardian/releases/tag/v0.5.0
[1.0.0-alpha]: https://github.com/Pamacea/guardian/releases/tag/v1.0.0-alpha
