#!/usr/bin/env bash
# ==============================================================================
# Qynova ERP - Automated MySQL Database Backup Script
# Features:
#  - Dumps MySQL database using mysqldump
#  - Compresses output with gzip
#  - Timestamps each backup: qynova_erp_backup_YYYYMMDD_HHMMSS.sql.gz
#  - Enforces a 7-day retention policy (auto-prunes older dumps)
#  - Supports crontab daily scheduling
# ==============================================================================

set -euo pipefail

# Script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env file if available
if [[ -f "${REPO_ROOT}/.env" ]]; then
  # Export variables from .env ignoring comments
  set -a
  source "${REPO_ROOT}/.env"
  set +a
elif [[ -f "${REPO_ROOT}/backend/.env" ]]; then
  set -a
  source "${REPO_ROOT}/backend/.env"
  set +a
fi

# Configuration with defaults
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-qynova_erp}"
BACKUP_DIR="${BACKUP_DIR:-${REPO_ROOT}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Timestamp & file naming
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/qynova_erp_backup_${TIMESTAMP}.sql.gz"

echo "=================================================="
echo "Qynova ERP Database Backup"
echo "Timestamp : $(date)"
echo "Database  : ${DB_NAME}@${DB_HOST}:${DB_PORT}"
echo "Target    : ${BACKUP_FILE}"
echo "=================================================="

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Build mysqldump password flag
MYSQL_PWD_OPT=""
if [[ -n "${DB_PASSWORD}" ]]; then
  export MYSQL_PWD="${DB_PASSWORD}"
fi

# Execute mysqldump with single-transaction and quick options for zero-downtime backup
echo "==> Creating compressed database dump..."
mysqldump \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_USER}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "${DB_NAME}" | gzip > "${BACKUP_FILE}"

# Verify file existence and non-zero size
if [[ -s "${BACKUP_FILE}" ]]; then
  FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "==> Backup successful! File size: ${FILE_SIZE}"
else
  echo "==> ERROR: Backup file was created empty or failed!" >&2
  exit 1
fi

# Enforce 7-day retention policy
echo "==> Pruning backups older than ${RETENTION_DAYS} days..."
PRUNED_COUNT=0
while IFS= read -r old_file; do
  if [[ -n "${old_file}" ]]; then
    rm -f "${old_file}"
    echo "    Removed expired backup: ${old_file}"
    PRUNED_COUNT=$((PRUNED_COUNT + 1))
  fi
done < <(find "${BACKUP_DIR}" -type f -name "qynova_erp_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}")

echo "==> Cleaned up ${PRUNED_COUNT} old backup file(s)."
echo "==> Backup process completed successfully."
exit 0
