# Contributing to Guardian

Thank you for your interest in contributing to Guardian! This document provides guidelines for contributing.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Pamacea/guardian
cd guardian

# Install dependencies
npm install

# Link for local testing
npm link

# Run the CLI
guardian
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run security-specific tests
npm run test:security

# Validate everything (lint, typecheck, test)
npm run validate
```

## Code Quality

```bash
# Lint code
npm run lint

# Type check (TypeScript)
npm run typecheck
```

## Adding a New Security Tool

When adding a new tool to the Docker container:

1. **Update the Dockerfile** (`docker/Dockerfile`):
   - Add the tool in the appropriate section (Recon, Vuln Scanning, Discovery, etc.)
   - Pin to a specific version or commit
   - Ensure non-root user can execute it

2. **Update the Prompt** (`prompt/REVIEW.md`):
   - Add the tool to the "Tool Selection Table"
   - Document its usage with an example command
   - Add any relevant wordlist paths if applicable

3. **Update the README**:
   - Add the tool to the "Included Tools" table
   - Categorize it appropriately

4. **Add Tests**:
   - Create a test in `tests/integration/tools.test.js`
   - Verify the tool is available and functional

5. **Document**:
   - Update CHANGELOG.md with your changes

## Commit Conventions

We follow semantic versioning and conventional commits:

- `feat:` - New features (MINOR version)
- `fix:` - Bug fixes (PATCH version)
- `security:` - Security fixes (PATCH version)
- `refactor:` - Code refactoring (PATCH version)
- `docs:` - Documentation only (PATCH version)
- `test:` - Adding or updating tests (PATCH version)
- `chore:` - Maintenance tasks (PATCH version)

### Examples

```
feat: add GraphQL introspection detection
fix: resolve Windows path issue with wordlists
security: upgrade nuclei to v3.3.7
docs: update installation instructions
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Make your changes and commit
4. Run tests (`npm run validate`)
5. Push to your fork
6. Open a pull request

### PR Checklist

- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Commits follow conventions

## Security Issues

For security vulnerabilities, please email security@example.com instead of opening a public issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
