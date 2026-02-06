# Guardian

AI-powered security review plugin for pentesting web applications. Automated vulnerability scanning and remediation with zero configuration.

## Quick Start

### Installation

```bash
# From your project directory
npx @oalacea/guardian
```

First run installs the security toolkit (~800 MB Docker image, takes 2-3 minutes).

### Production Mode

For external security testing:

```bash
npx @oalacea/guardian https://example.com
```

### Usage

After installation, open your AI coding agent and paste:

```
Read ~/.guardian/REVIEW.md and start the security review
```

The AI will:
1. Auto-detect your framework, target URL, and environment
2. Ask for confirmation
3. Scan for vulnerabilities
4. Fix issues directly in your code (dev mode)
5. Verify each fix
6. Provide a summary

## What You Need

- **Docker** — [Install](https://docs.docker.com/get-docker/)
- **AI coding agent** — Claude Code, Cursor, Windsurf, Aider, Codex...

## Included Tools

The Docker toolkit includes:

| Category | Tools |
|----------|-------|
| Recon | nmap, subfinder, whatweb, httpx |
| Vuln Scanning | nuclei, nikto |
| Discovery | ffuf, arjun |
| SQL Injection | sqlmap |
| XSS | dalfox |
| JWT | jwt_tool |
| Brute Force | hydra |
| Command Injection | commix |
| SSL/TLS | testssl.sh |
| Wordlists | SecLists (Web-Content, DNS, Fuzzing, Passwords) |

## What It Tests

- **Injection**: SQLi, NoSQL, SSTI, XXE, LDAP, Command injection
- **Cross-Site**: XSS (reflected, stored, DOM), CSRF, CORS misconfig
- **Server-Side**: SSRF, deserialization, path traversal, file upload
- **Auth**: Authentication bypass, privilege escalation, IDOR, JWT manipulation
- **Logic**: Mass assignment, business logic flaws, race conditions
- **Infrastructure**: Subdomain takeover, missing headers, info disclosure
- **DoS**: ReDoS, GraphQL deep nesting
- **GraphQL**: Introspection, batching, nested query DoS

## Safety

- Always test against dev/staging first
- Never test production without written authorization
- Backup your code (use git)
- Production mode uses non-destructive tests only

## Troubleshooting

### Rebuild toolkit image

```bash
docker rm -f guardian-tools
docker rmi guardian-tools
npx @oalacea/guardian
```

### Test tools manually

```bash
docker exec guardian-tools nmap --version
docker exec guardian-tools sqlmap --version
```

## License

MIT — Use at your own risk. Only test systems you own or have explicit permission to test.

## Credits

Inspired by [nicefox-secu](https://github.com/co-l/nicefox-secu) and [AIDA](https://github.com/Vasco0x4/AIDA).
