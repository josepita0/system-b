# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue.

Instead, please report it via email at joseacureropita0@gmail.com.

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- We will keep you informed about the progress of fixing the vulnerability

### Disclosure policy

- We follow coordinated disclosure
- We will work with you to understand and reproduce the issue
- We will not take legal action against researchers who follow this policy
- We will acknowledge your contribution (unless you prefer to remain anonymous)

## Security Best Practices

When deploying System Barra:

1. **Keep Node.js updated** — Use the LTS version (22.x)
2. **Protect local data** — The SQLite database contains sensitive business data
3. **Secure SMTP credentials** — Use environment variables, never commit `.env`
4. **Review IPC handlers** — All IPC channels must validate input and check authorization
5. **Monitor sessions** — Review active sessions periodically

## Known Security Considerations

- Session data is stored locally using `safeStorage` when available
- SMTP passwords can be configured via environment variable `SYSTEM_BARRA_SMTP_PASSWORD`
- Content Security Policy is defined in `index.html`
- Electron sandbox mode is under evaluation

## Security Updates

Security updates are released as soon as possible after a vulnerability is confirmed and a fix is available.

Subscribe to repository notifications to receive security update announcements.
