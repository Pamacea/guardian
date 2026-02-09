# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
