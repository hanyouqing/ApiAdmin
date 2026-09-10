#!/usr/bin/env bash
# MongoDB dump for ApiAdmin
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/apiadmin_${TIMESTAMP}.archive.gz"

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
echo "Backing up MongoDB to ${BACKUP_FILE}..."
echo "  URI host: $(echo "$URI" | sed -E 's#mongodb(\+srv)?://([^@]+@)?##; s#/.*##')"

if ! command -v mongodump >/dev/null 2>&1; then
  echo "❌ mongodump not found. Install MongoDB Database Tools."
  exit 1
fi

mongodump --uri="$URI" --archive --gzip > "$BACKUP_FILE"
echo "✅ Backup complete: $BACKUP_FILE"
