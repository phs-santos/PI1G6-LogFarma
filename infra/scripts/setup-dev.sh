#!/usr/bin/env bash
# Clona backend, frontend e style-guide ao lado deste repo (se ainda não existirem)
# e cria o .env local. Rode a partir de qualquer pasta.
set -euo pipefail

INFRA_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RAIZ="$(dirname "$INFRA_DIR")"

for repo in backend frontend style-guide; do
  if [ -d "$RAIZ/$repo/.git" ]; then
    echo "✓ $repo já existe"
  else
    git clone "git@github.com:Grupo-PI-6/$repo.git" "$RAIZ/$repo"
  fi
done

[ -f "$INFRA_DIR/.env" ] || cp "$INFRA_DIR/.env.example" "$INFRA_DIR/.env"

if ! ssh-add -l >/dev/null 2>&1 && ! grep -q "^GITHUB_SSH_KEY=" "$INFRA_DIR/.env"; then
  echo
  echo "⚠ Seu ssh-agent está sem chaves. O build do frontend precisa dele para baixar o style-guide:"
  echo "    ssh-add ~/.ssh/<sua-chave-do-github>   (ou defina GITHUB_SSH_KEY no .env)"
fi

echo
echo "Pronto. Para subir tudo:  cd $INFRA_DIR && docker compose up --build"
