# Imagem do backend. O contexto de build é a RAIZ do monorepo:
#   docker build -f apps/backend/Dockerfile --target prod .
# Alvos:
#   dev  — tsx watch com o código montado como volume (infra/compose.yaml)
#   prod — node dist/server.js, só com dependências de produção (aplica as migrações ao iniciar)
#
# Seed da demonstração dentro do container de produção (apaga os dados!):
#   docker compose exec -e ALLOW_DEMO_SEED=true backend node dist/db/seed.js
FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

# Manifests do workspace inteiro: o pnpm precisa deles para validar o lockfile único.
FROM base AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/style-guide/package.json packages/style-guide/

FROM manifests AS deps
RUN pnpm install --frozen-lockfile --filter @fatec-pi/backend...

FROM deps AS dev
ENV NODE_ENV=development
WORKDIR /app/apps/backend
EXPOSE 3333
CMD ["pnpm", "dev"]

FROM deps AS build
COPY apps/backend/tsconfig.json apps/backend/
COPY apps/backend/src apps/backend/src
RUN pnpm --filter @fatec-pi/backend build

FROM manifests AS prod
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --prod --filter @fatec-pi/backend
COPY --from=build /app/apps/backend/dist apps/backend/dist
# Migrações SQL: o servidor aplica ao iniciar (src/db/migrate.ts lê ./drizzle).
COPY apps/backend/drizzle apps/backend/drizzle
WORKDIR /app/apps/backend
USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://localhost:3333/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
