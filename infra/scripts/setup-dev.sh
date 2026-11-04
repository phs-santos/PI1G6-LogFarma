#!/usr/bin/env bash
# Prepara o ambiente de desenvolvimento do monorepo: cria o .env único da raiz
# a partir do .env.example (se ainda não existir). Rode a partir de qualquer pasta.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
DESTINO="$RAIZ/.env"

# Antes o dev tinha dois arquivos (apps/backend/.env e infra/.env). Se o do backend
# existir e o da raiz não, ele é movido para a raiz — é o que tem as variáveis do backend.
ANTIGO_BACKEND="$RAIZ/apps/backend/.env"
ANTIGO_INFRA="$RAIZ/infra/.env"

if [ -f "$DESTINO" ]; then
  echo "✓ .env já existe na raiz"
elif [ -f "$ANTIGO_BACKEND" ]; then
  mv "$ANTIGO_BACKEND" "$DESTINO"
  echo "→ movido apps/backend/.env para .env (raiz)"
else
  cp "$RAIZ/.env.example" "$DESTINO"
  echo "+ criado .env (raiz)"
fi

for antigo in "$ANTIGO_BACKEND" "$ANTIGO_INFRA"; do
  if [ -f "$antigo" ]; then
    echo "! ${antigo#"$RAIZ"/} não é mais lido. Passe o que for preciso para o .env da raiz e apague-o."
  fi
done

echo
echo "Pronto. Para subir tudo no Docker:  cd $RAIZ && pnpm docker:dev"
echo "Sem Docker:                          cd $RAIZ && pnpm install && pnpm dev"
