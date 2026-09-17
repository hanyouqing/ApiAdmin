#!/usr/bin/env bash
# ApiAdmin Phase 1 — demo-ready full-lifecycle script (self-hosted)
#
# Prerequisites:
#   make start   # or docker-up — API on :3000, Client on :3001
#   Admin user + optional SSO IdP; Ollama optional (falls back if down)
#
# Usage:
#   export APIADMIN_URL=http://localhost:3000
#   export APIADMIN_EMAIL=admin@example.com
#   export APIADMIN_PASSWORD='your-password'
#   ./Scripts/demo-lifecycle.sh
#
set -euo pipefail

API="${APIADMIN_URL:-http://localhost:3000}"
EMAIL="${APIADMIN_EMAIL:-}"
PASSWORD="${APIADMIN_PASSWORD:-}"
CLI="${APIADMIN_CLI:-npx apiadmin}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Set APIADMIN_EMAIL and APIADMIN_PASSWORD"
  exit 2
fi

echo "==> 1. Login (password)"
LOGIN=$(curl -sS -X POST "$API/api/user/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.success){console.error(j.message||d);process.exit(1)}; console.log(j.data.token||j.data.accessToken||'')})")
AUTH="Authorization: Bearer $TOKEN"
echo "    OK (JWT acquired)"

echo "==> 2. Design — pick first project + ensure interface"
PROJECTS=$(curl -sS "$API/api/project/list" -H "$AUTH")
PROJECT_ID=$(echo "$PROJECTS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); const list=j.data||j.data?.list||[]; const p=Array.isArray(list)?list[0]:(list.list||[])[0]; if(!p){console.error('No project');process.exit(1)}; console.log(p._id)})")
echo "    project=$PROJECT_ID"

IFACE=$(curl -sS -X POST "$API/api/interface/add" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"project_id\":\"$PROJECT_ID\",\"title\":\"Demo Ping\",\"path\":\"/demo/ping\",\"method\":\"GET\",\"status\":\"developing\"}" || true)
IFACE_ID=$(echo "$IFACE" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d); console.log(j.data?._id||j.data?.id||'')}catch{console.log('')}})" || true)
if [[ -z "$IFACE_ID" ]]; then
  LIST=$(curl -sS "$API/api/interface/list?project_id=$PROJECT_ID" -H "$AUTH")
  IFACE_ID=$(echo "$LIST" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); const list=j.data||[]; console.log((list[0]||{})._id||'')})")
fi
echo "    interface=$IFACE_ID"
echo "    mock URL: $API/mock/$PROJECT_ID/demo/ping"

echo "==> 3. Docs — generate + publish (DocumentCenter path A)"
GEN=$(curl -sS -X POST "$API/api/docs/generate" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PROJECT_ID\"}")
DOC_ID=$(echo "$GEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.success){console.error(j.message);process.exit(1)}; console.log(j.data.documentId)})")
curl -sS -X POST "$API/api/docs/publish" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"documentId\":\"$DOC_ID\",\"projectId\":\"$PROJECT_ID\"}" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.success){console.error(j.message);process.exit(1)}; console.log('    published')})"
curl -sS "$API/api/docs/published?projectId=$PROJECT_ID" -H "$AUTH" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.success){console.error(j.message);process.exit(1)}; console.log('    portal title:', j.data.title)})"

echo "==> 4. Mock — probe mock URL"
MOCK_CODE=$(curl -sS -o /tmp/apiadmin-mock.json -w '%{http_code}' "$API/mock/$PROJECT_ID/demo/ping" || echo 000)
echo "    mock HTTP $MOCK_CODE (expectations optional)"

echo "==> 5/6. Test + CI — CLI token + collection run (JUnit) if collection exists"
TOK=$(curl -sS -X POST "$API/api/cicd/tokens" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"name\":\"demo-$(date +%s)\",\"projectId\":\"$PROJECT_ID\"}")
CLI_TOKEN=$(echo "$TOK" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.success){console.error(j.message);process.exit(1)}; console.log(j.data.token)})")
echo "    CLI token prefix: ${CLI_TOKEN:0:8}…"

COLLECTIONS=$(curl -sS "$API/api/test/collections?project_id=$PROJECT_ID" -H "$AUTH" || echo '{}')
COLLECTION_ID=$(echo "$COLLECTIONS" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d); const list=j.data||[]; console.log((list[0]||{})._id||'')}catch{console.log('')}})")
if [[ -n "$COLLECTION_ID" ]]; then
  curl -sS -X POST "$API/api/cicd/run" \
    -H "Authorization: Bearer $CLI_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"collectionId\":\"$COLLECTION_ID\",\"format\":\"junit\"}" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); if(!j.success){console.error(j.message);process.exit(1)}; require('fs').writeFileSync('apiadmin-junit.xml', j.data.content||''); console.log('    wrote apiadmin-junit.xml, exitCode=', j.data.exitCode)})"
else
  echo "    No test collection — skip JUnit run (create one in UI Test tab)"
fi

echo "==> 7. UI checklist"
echo "    Open Client, same look:"
echo "    - Project → Docs: published portal preview"
echo "    - Interface: Mock URL copy + TestEnvironment env switcher"
echo "    - Settings → CI / CLI Tokens"
echo "    - Test Pipeline → Download JUnit on a result"
echo "Done."
