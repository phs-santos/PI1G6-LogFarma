#!/usr/bin/env bash
# Faz dump do banco de produção na VPS e baixa uma cópia para ./backups.
# Mantém os 7 dumps mais recentes na VPS.
#
# Uso: VPS_HOST=1.2.3.4 VPS_USER=deploy ./scripts/backup-db.sh
set -euo pipefail

: "${VPS_HOST:?defina VPS_HOST}"
: "${VPS_USER:?defina VPS_USER}"
VPS_PORT="${VPS_PORT:-22}"
REMOTE_DIR="grupo-pi-6"
ARQUIVO="db-$(date +%Y%m%d-%H%M%S).sql.gz"
INFRA_DIR="$(cd "$(dirname "$0")/.." && pwd)"

ssh -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" bash -s -- "$REMOTE_DIR" "$ARQUIVO" <<'REMOTO'
set -euo pipefail
cd ~/"$1"
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' | gzip > "backups/$2"
ls -1t backups/db-*.sql.gz | tail -n +8 | xargs -r rm --
echo "✓ backups/$2 na VPS"
REMOTO

mkdir -p "$INFRA_DIR/backups"
scp -P "$VPS_PORT" "$VPS_USER@$VPS_HOST:~/$REMOTE_DIR/backups/$ARQUIVO" "$INFRA_DIR/backups/"
echo "✓ Cópia local em backups/$ARQUIVO"
