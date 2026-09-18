# ApiAdmin OSS Quick Start (15 minutes)

Self-hosted API lifecycle demo: **Import → Interface → Mock → Run → Pipeline/CLI → Monitor**.

License: Apache-2.0. Stack: React/Vite + Koa + MongoDB + Redis.

## Prerequisites

- Node.js ≥ 18
- MongoDB (local or Docker)
- Redis (local or Docker)
- Optional: AI provider key for Gen Mock / code-fix (works without key via rule fallback)

## 1. Clone & install

```bash
git clone https://github.com/hanyouqing/ApiAdmin.git
cd ApiAdmin
cp .env.example .env   # set JWT_SECRET (≥32 chars), MONGODB_URL, REDIS_URL
npm install
cd Client && npm install && cd ..
cd Server && npm install && cd ..
```

## 2. Start

```bash
make start
# or: npm run dev
```

- UI: http://localhost:3001 (or Client Vite port)
- API: http://localhost:3000

### Optional: seed demo data

With MongoDB running and `MONGODB_URL` set:

```bash
make seed-demo
# creates demo@apiadmin.local / Demo1234! + project "ApiAdmin Demo"
# imports examples/openapi-petstore-mini.json
```

Or create the first super-admin via UI register (if `ALLOW_PUBLIC_REGISTRATION=true`) or follow `Docs/SUPER_ADMIN_SETUP.md`.

## 3. Golden path (manual)

1. **Group → Project** — open **ApiAdmin Demo** (if seeded) or create a project.
2. **Import** — use sidebar Swagger import with `examples/openapi-petstore-mini.json` (skip if seeded).
3. **Interface** — open one API → **Run** against httpbin or Mock (`ALLOW_PRIVATE_OUTBOUND=true` only for local targets).
4. **Mock** — Interface → Mock expectations → **AI Generate Mock** (or create manually). Hit `/mock/:projectId/...`.
5. **Test Pipeline** — add cases, run once; on failure use **Suggest code fix**.
6. **CLI** (optional):
   ```bash
   make cli
   # npm run cli -- run-collection --help
   ```
7. **API Monitor** — sidebar → create probe → Run now → Suggest code fix on failing runs.

## 4. Verify install

```bash
make test
# focused:
make test-package FILE=tests/unit/MockGenerator.test.js
```

## 5. Optional cloud AI

In Admin → AI config (or project AI):

- Provider: `openai` / `deepseek` / `local` (OpenAI-compatible `baseUrl`)
- Leave unset → Gen Mock uses **rule-based** responses from `res_body` / schema-ish defaults
- Secrets in headers (`Authorization`, `api-key`, cookies) are **never** sent to cloud prompts

## Roadmap (not in this demo)

- GraphQL / WebSocket / gRPC
- Full MeterSphere-style scenario orchestration
- Multi-tenant SaaS billing

See `Docs/POSTMAN_PARITY_AND_LIFECYCLE.md` and `Docs/SPRINT_6DAY_CHECKLIST.md`.
