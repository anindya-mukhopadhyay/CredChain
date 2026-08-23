#!/usr/bin/env bash
# ==============================================================================
# CredChain — Database Restore Script (scripts/db-restore.sh)
# ==============================================================================
# Restores a logical PostgreSQL database backup from a .sql or .sql.gz file.
# Relies on DATABASE_URL environment variable. NEVER hardcode credentials!
# ==============================================================================

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL environment variable is not set." >&2
  echo "Usage: DATABASE_URL=postgres://... ./scripts/db-restore.sh <path_to_backup_file>" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Error: Backup file path required." >&2
  echo "Usage: ./scripts/db-restore.sh <path_to_backup_file>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Error: Backup file '${BACKUP_FILE}' not found." >&2
  exit 1
fi

echo "==> WARNING: Restoring from '${BACKUP_FILE}' will overwrite existing data."
echo "==> Target Database: $(echo "${DATABASE_URL}" | sed -E 's/:[^@]+@/:***@/')"

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "==> Decompressing and executing SQL restore..."
  gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}" -v ON_ERROR_STOP=1
else
  echo "==> Executing SQL restore..."
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${BACKUP_FILE}"
fi

echo "==> Database restore completed successfully."
