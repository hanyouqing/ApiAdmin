#!/usr/bin/env bash
# MongoDB restore for ApiAdmin
set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "❌ Usage: Scripts/restore-mongodb.sh path/to/backup.archive.gz"
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

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
echo "⚠️  Restoring MongoDB from $FILE"
echo "   This will OVERWRITE matching collections. Press Ctrl+C to cancel."
sleep 3

if ! command -v mongorestore >/dev/null 2>&1; then
  echo "❌ mongorestore not found. Install MongoDB Database Tools."
  exit 1
fi

mongorestore --uri="$URI" --archive --gzip --drop < "$FILE"
echo "✅ Restore complete from $FILE"
