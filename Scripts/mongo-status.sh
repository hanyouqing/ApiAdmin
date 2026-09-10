#!/usr/bin/env bash
# Show MongoDB ping + collection counts for ApiAdmin
set -euo pipefail

resolve_uri() {
  if [ -n "${MONGODB_URL:-}" ]; then
    echo "$MONGODB_URL"
    return
  fi
  local host="${MONGO_HOST:-localhost}"
  local port="${MONGO_PORT:-27017}"
  local db="${MONGO_DATABASE:-apiadmin}"
  local user="${MONGO_USERNAME:-}"
  local pass="${MONGO_PASSWORD:-}"
  if [ -n "$user" ] && [ -n "$pass" ]; then
    echo "mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=admin"
  else
    echo "mongodb://${host}:${port}/${db}"
  fi
}

URI="$(resolve_uri)"

if command -v mongosh >/dev/null 2>&1; then
  mongosh "$URI" --quiet --eval '
    const ok = db.runCommand({ ping: 1 }).ok;
    print("ping:", ok ? "ok" : "failed");
    print("database:", db.getName());
    const cols = db.getCollectionNames().sort();
    print("collections:", cols.length);
    cols.forEach((c) => print(`  - ${c}: ${db.getCollection(c).estimatedDocumentCount()}`));
  '
elif command -v mongo >/dev/null 2>&1; then
  mongo "$URI" --quiet --eval 'printjson(db.runCommand({ ping: 1 })); printjson(db.getCollectionNames());'
else
  echo "❌ mongosh/mongo not found"
  exit 1
fi
