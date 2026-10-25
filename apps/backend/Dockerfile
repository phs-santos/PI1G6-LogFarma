# Imagem do backend. Alvos:
#   dev  — tsx watch com o código montado como volume (compose de desenvolvimento do repo infra)
#   prod — node dist/server.js, só com dependências de produção
FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3333
CMD ["pnpm", "dev"]

FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

FROM base AS prod
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://localhost:3333/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
