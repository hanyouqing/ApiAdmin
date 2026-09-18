# 6-day / 3-person sprint checklist

**Positioning:** OSS first → later enterprise/SaaS. Balanced YApi + Postman + light MS. Self-host + optional cloud AI.  
**AI focus:** Gen Mock + code-fix PR suggestions. **Protocol:** REST only this sprint.  
**Cursor:** Cloud Agents on feature branches; humans review/merge.

## Day 0 (done when checked)

- [x] P1/P2 merged via PR (#23) — keep `main` tracking `origin/main`:
  ```bash
  git fetch origin
  git checkout main
  git branch -u origin/main main
  git pull --ff-only origin main
  ```
- [x] Docs: `QUICKSTART_OSS.md`, this checklist, `CLOUD_AGENT_PROMPTS.md`
- [ ] Branches created:
  - `feat/oss-demo`
  - `feat/ai-mock` (local Gen Mock work can land here or on main WIP)
  - `feat/ai-codefix`
- [ ] Launch Cloud Agents with prompts in `CLOUD_AGENT_PROMPTS.md`

## Day 1–2 — OSS golden path (Person P + F)

- [x] README links to `Docs/QUICKSTART_OSS.md` (EN + ZH)
- [x] Sample OpenAPI fixture: `examples/openapi-petstore-mini.json`
- [x] `make seed-demo` / `npm run seed-demo`
- [x] GitHub issue templates (bug / feat / good first issue)
- [ ] Blind run: teammate follows Quick Start only
- [ ] LICENSE / dependency license spot-check (prefer MIT/Apache)

## Day 2–4 — AI Gen Mock (Person B + F)

- [x] API `POST /api/ai/generate-mock` (+ optional save)
- [x] Rule fallback without AI config
- [x] Secret redaction in prompts
- [x] UI button on Mock expectations
- [ ] Unit tests green: `tests/unit/MockGenerator.test.js`
- [ ] i18n en + zh-CN

## Day 3–5 — AI code-fix (Cloud Agent 2 + B)

- [x] Failure detail → AI patch suggestion (`POST /api/ai/suggest-code-fix`)
- [x] Optional draft PR via code repository token (GitHub/GitLab)
- [x] Audit log (`ai_code_fix`); no silent apply
- [x] Pipeline result + Monitor run UI buttons
- [x] Unit tests: `tests/unit/CodeFixSuggester.test.js`

## Day 5–6 — Release

- [ ] Merge branches; `make test` + Client `tsc`/build
- [ ] Tag `v0.1.0-oss` + release notes
- [ ] GIF/screenshot golden path
- [ ] 5× `good first issue` filed
- [ ] Roadmap explicitly lists GraphQL / SaaS as future

## DoD

Stranger can demo golden path in 15 minutes; Gen Mock works offline; code-fix shows a reviewable diff.
