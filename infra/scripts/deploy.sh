#!/usr/bin/env bash
# Sobe (ou atualiza) a produção na VPS.
#
# Uso:
#   VPS_HOST=1.2.3.4 VPS_USER=deploy ./scripts/deploy.sh            # última versão (latest)
#   VPS_HOST=... VPS_USER=... BACKEND_TAG=a1b2c3d ./scripts/deploy.sh  # versão específica (rollback)
#
# Variáveis:
#   VPS_HOST, VPS_USER          obrigatórias
#   VPS_PORT                    porta SSH (padrão 22)
#   REMOTE_DIR                  pasta do projeto na VPS (padrão /opt/apps/grupo-pi-6)
#   BACKEND_TAG, FRONTEND_TAG   tag da imagem: "latest" ou o sha curto do commit (padrão latest)
#   REGISTRY_USER, REGISTRY_TOKEN
#                               login no ghcr.io para baixar as imagens privadas.
#                               Localmente: seu usuário + token com read:packages.
#                               No GitHub Actions: preenchidos pelo workflow.
set -euo pipefail

: "${VPS_HOST:?defina VPS_HOST}"
: "${VPS_USER:?defina VPS_USER}"
VPS_PORT="${VPS_PORT:-22}"
BACKEND_TAG="${BACKEND_TAG:-latest}"
FRONTEND_TAG="${FRONTEND_TAG:-latest}"
REMOTE_DIR="${REMOTE_DIR:-/opt/apps/grupo-pi-6}"

INFRA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SSH=(ssh -p "$VPS_PORT" -o StrictHostKeyChecking=accept-new "$VPS_USER@$VPS_HOST")

echo "→ Enviando compose.prod.yaml para $VPS_HOST:$REMOTE_DIR"
"${SSH[@]}" "mkdir -p $REMOTE_DIR"
scp -P "$VPS_PORT" -o StrictHostKeyChecking=accept-new \
  "$INFRA_DIR/compose.prod.yaml" "$VPS_USER@$VPS_HOST:$REMOTE_DIR/compose.yaml"

if ! "${SSH[@]}" "test -f $REMOTE_DIR/.env"; then
  echo "✗ Falta $REMOTE_DIR/.env na VPS. Crie a partir de .env.prod.example (veja o README)." >&2
  exit 1
fi

echo "→ Atualizando containers (backend=$BACKEND_TAG, frontend=$FRONTEND_TAG)"
# O token vai num arquivo só do usuário (apagado em seguida) para não aparecer na lista de processos.
if [ -n "${REGISTRY_TOKEN:-}" ]; then
  printf '%s' "$REGISTRY_TOKEN" | "${SSH[@]}" "umask 077 && cat > $REMOTE_DIR/.registry-token"
fi

"${SSH[@]}" bash -s -- "$REMOTE_DIR" "$BACKEND_TAG" "$FRONTEND_TAG" "${REGISTRY_USER:-}" <<'REMOTO'
set -euo pipefail
cd "$1"
if [ -f .registry-token ]; then
  docker login ghcr.io -u "$4" --password-stdin < .registry-token >/dev/null
  rm -f .registry-token
  trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
fi
export BACKEND_TAG="$2" FRONTEND_TAG="$3"
docker compose pull
docker compose up -d --remove-orphans --wait
docker image prune -f >/dev/null
docker compose ps

HTTP_PORT="$(sed -n 's/^HTTP_PORT=//p' .env)"
echo "→ Conferindo /api/health"
curl -fsS "http://localhost:${HTTP_PORT:-80}/api/health"
echo
REMOTO

echo "✓ Deploy concluído"
