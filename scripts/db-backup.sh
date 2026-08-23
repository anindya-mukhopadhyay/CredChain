#!/usr/bin/env bash
# ==============================================================================
# CredChain — Database Backup Script (scripts/db-backup.sh)
# ==============================================================================
# Performs a logical PostgreSQL database backup using pg_dump.
# Relies on DATABASE_URL environment variable. NEVER hardcode credentials!
# ==============================================================================

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL environment variable is not set." >&2
  echo "Usage: DATABASE_URL=postgres://... ./scripts/db-backup.sh [output_directory]" >&2
  exit 1
fi

OUTPUT_DIR="${1:-./backups}"
mkdir -p "${OUTPUT_DIR}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${OUTPUT_DIR}/credchain_backup_${TIMESTAMP}.sql.gz"

echo "==> Starting CredChain database backup..."
pg_dump "${DATABASE_URL}" --format=plain --no-owner --no-privileges | gzip > "${BACKUP_FILE}"

echo "==> Backup successfully created at: ${BACKUP_FILE}"
echo "==> Size: $(du -h "${BACKUP_FILE}" | cut -f1)"
