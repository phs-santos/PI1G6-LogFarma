# Imagem do frontend. O contexto de build é a RAIZ do monorepo:
#   docker build -f apps/frontend/Dockerfile --target prod .
# Alvos:
#   dev  — vite dev com o código montado como volume (infra/compose.yaml)
#   prod — build estático servido por nginx, que também repassa /api para o backend
#
# O style-guide vem do próprio monorepo (packages/style-guide, "workspace:*"): sem chave SSH.
FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/style-guide/package.json packages/style-guide/
# "..." inclui as dependências do style-guide (react, tipos) usadas ao compilar o frontend.
RUN pnpm install --frozen-lockfile --filter @fatec-pi/frontend...

FROM deps AS dev
WORKDIR /app/apps/frontend
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

FROM deps AS build
COPY packages/style-guide packages/style-guide
COPY apps/frontend apps/frontend
RUN pnpm --filter @fatec-pi/frontend build

FROM nginx:1.27-alpine AS prod
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
