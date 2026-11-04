#!/usr/bin/env bash
# Prepara o ambiente de desenvolvimento do monorepo: cria os .env locais
# a partir dos exemplos (se ainda não existirem). Rode a partir de qualquer pasta.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"

for exemplo in "$RAIZ/infra/.env.example" "$RAIZ/apps/backend/.env.example"; do
  destino="$(dirname "$exemplo")/.env"
  if [ -f "$destino" ]; then
    echo "✓ ${destino#"$RAIZ"/} já existe"
  else
    cp "$exemplo" "$destino"
    echo "+ criado ${destino#"$RAIZ"/}"
  fi
done

echo
echo "Pronto. Para subir tudo no Docker:  cd $RAIZ && pnpm docker:dev"
echo "Sem Docker:                          cd $RAIZ && pnpm install && pnpm dev"
