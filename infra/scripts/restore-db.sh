#!/usr/bin/env bash
# Restaura um dump no banco de DESENVOLVIMENTO local (docker compose up db).
# Uso: ./scripts/restore-db.sh backups/db-20261025-120000.sql.gz
# Atenção: dumps de produção podem ter dados pessoais (LGPD). Não compartilhe nem faça commit.
set -euo pipefail

DUMP="${1:?informe o arquivo .sql.gz}"
cd "$(dirname "$0")/.."

docker compose up -d --wait db
gunzip -c "$DUMP" | docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
echo "✓ Restaurado em pi-dev/db"
