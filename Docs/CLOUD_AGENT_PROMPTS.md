# Cloud Agent prompts (copy-paste)

Use **Cursor Cloud Agent** → new branch from latest `main`.  
One agent per prompt. Humans only review PRs and run `make test`.

---

## Agent 1 — `feat/ai-mock` (if extending beyond Day0 Gen Mock)

```text
Repo: ApiAdmin (self-hosted API admin). Branch: feat/ai-mock from main.

Goal: Harden AI Mock generation for OSS demo.

Already may exist:
- Server/Utils/mockGenerator.js
- POST /api/ai/generate-mock on AIAssistant
- UI button in Client/Containers/Project/Interface.tsx Mock modal

Your job:
1. Ensure generate-mock never sends Authorization, Cookie, api-key, token, secret header/query values to cloud AI (redact to [REDACTED]).
2. Rule-based fallback when AIConfig missing or AI fails; still return a valid MockExpectation-shaped payload.
3. Optional body flag save=true creates MockExpectation via same shape as POST /api/mock/expectation/add.
4. Unit tests in tests/unit/MockGenerator.test.js (no live AI).
5. i18n keys under interface.mockExpectation.* in zh-CN.json and en.json.
6. Update Docs/QUICKSTART_OSS.md if UX labels change.

Do NOT: GraphQL, WebSocket, refactor unrelated admin pages, reintroduce vm2.

Acceptance:
- make test-package FILE=tests/unit/MockGenerator.test.js passes
- Client tsc --noEmit clean for touched files
```

---

## Agent 2 — `feat/ai-codefix`

```text
Repo: ApiAdmin. Branch: feat/ai-codefix from main.

Goal: From failed AutoTest Pipeline or API Monitor run, propose a code fix against the project's linked Code Repository; human must approve.

Implement:
1. API e.g. POST /api/ai/suggest-code-fix { run_type: 'pipeline'|'monitor', run_id, project_id }
2. Load failure summary (status, assertions, error message). Redact secrets.
3. If CodeRepository configured for project, fetch relevant file(s) via existing Server/Utils/codeRepositoryService.js / Controllers/CodeRepository.js patterns (reuse generateUnitTests/fixTestIssues ideas in aiService.js).
4. Return { summary, files: [{ path, diff, rationale }] }. Never auto-commit.
5. Optional: create_draft_pr=true calls GitHub/GitLab draft PR only if token present; else return copy-pasteable patch.
6. UI: on Test Pipeline result detail and/or Monitor run drawer — button "Suggest code fix"; show diff in Modal; Confirm disabled until user reviews.
7. OperationLog type 'test' with action 'ai_code_fix'.
8. Unit tests with mocked AI + mocked repo fetch.
9. i18n en + zh-CN.

Constraints:
- Self-host default; cloud AI optional via existing AIConfig.
- REST only. No GraphQL.
- Do not reintroduce vm2. Do not force-push main.

Acceptance:
- Without AI key: clear error or heuristic stub message, no crash
- With mocked AI: returns a unified diff string
- Without repo token: UI still shows diff text
```

---

## Agent 3 (optional) — `feat/oss-demo`

```text
Branch: feat/oss-demo from main.

Goal: Make OSS first-run foolproof.

1. Add examples/openapi-petstore-mini.json (5–10 REST paths).
2. Wire README.md + README_zh.md top Quick Start to Docs/QUICKSTART_OSS.md.
3. Script Scripts/seed-demo.mjs (or make target) that creates demo group/project if empty (document required env).
4. List 5 GitHub issue templates under .github/ISSUE_TEMPLATE for good-first-issue ideas from real gaps (nested folder UX, GraphQL later, etc.).

Do not change auth security defaults (keep strong JWT requirement in production).
```

---

## Human merge order

1. `feat/ai-mock` (or local Gen Mock commit)  
2. `feat/oss-demo`  
3. `feat/ai-codefix`  
4. Tag `v0.1.0-oss`
