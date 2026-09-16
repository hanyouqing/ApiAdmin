# Security Policy

## Supported versions

Security fixes are applied to the latest `main` branch of ApiAdmin. Self-hosted operators should stay current with releases.

## Reporting a vulnerability

Please report security issues privately (do not open a public GitHub issue with exploit details).

Include:

- Affected version / commit
- Description of the issue and impact
- Steps to reproduce (if safe to share)

We aim to acknowledge reports within a reasonable time and coordinate disclosure.

## Hardened production defaults

ApiAdmin is designed for **self-hosted** deployment. In production:

| Control | Behavior |
| --- | --- |
| `JWT_SECRET` | Required; weak/short secrets rejected |
| `CORS_ORIGIN` | Must be explicit (no `*`) |
| `REDIS_URL` | **Required** unless `REQUIRE_REDIS=false` (emergency single-instance only) |
| Query-string tokens | Rejected |
| Mock scripts | Off unless dual-flag (`ALLOW_MOCK_SCRIPTS` + `ALLOW_UNSAFE_MOCK_SCRIPTS`) |
| `REGULATED=true` | Forces mock scripts off; disables cloud AI unless `ALLOW_CLOUD_AI=true` |
| AI / SSO secrets | Encrypted at rest (`SECRETS_ENCRYPTION_KEY` or derived from `JWT_SECRET`) |
| CLI / project tokens | Stored as SHA-256 hashes |
| Outbound HTTP | SSRF checks (`assertSafeOutboundUrl`); private hosts require `ALLOW_PRIVATE_OUTBOUND=true` |
| Script runtime | `node:vm` only — **do not** reintroduce `vm2` |
| Helm secrets | Empty/short JWT, empty Mongo/Redis passwords, and `CORS_ORIGIN=*` fail chart render |

## AuthZ notes

- Mutating project/group routes require membership (or `super_admin`).
- CI callers use `/api/cicd/*` with hashed CLI tokens (`Authorization` or `X-CLI-Token`).

## Responsible features

Prefer MIT/Apache dependencies. Run `make audit` and CI Trivy scans before production upgrades.
