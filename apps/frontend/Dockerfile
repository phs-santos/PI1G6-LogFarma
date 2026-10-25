# syntax=docker/dockerfile:1
# Imagem do frontend. Alvos:
#   dev  — vite dev com o código montado como volume (compose de desenvolvimento do repo infra)
#   prod — build estático servido por nginx, que também repassa /api para o backend
#
# O style-guide é um repo privado instalado por SSH: o build precisa de `--ssh default`
# (o compose já passa) e de uma chave com acesso à org carregada no ssh-agent.
FROM node:24-slim AS base
RUN corepack enable \
  && apt-get update && apt-get install -y --no-install-recommends git openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p -m 0700 /root/.ssh && ssh-keyscan github.com >> /root/.ssh/known_hosts
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=ssh pnpm install --frozen-lockfile

FROM deps AS dev
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
