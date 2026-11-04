# backend — Grupo PI 6

API do sistema (`@fatec-pi/backend`). Fastify 5 + TypeScript em ESM (`module: NodeNext`).

## Comandos

```bash
pnpm install
cp .env.example .env
pnpm dev          # http://localhost:3333 — teste com: curl localhost:3333/api/health
pnpm typecheck    # obrigatório antes de considerar pronto
pnpm test         # obrigatório: testes com banco real (docker compose -f ../../infra/compose.yaml up -d db)
pnpm db:seed      # recarrega a demonstração (apaga o banco de dev)
pnpm build
```

## Estrutura

- `src/server.ts` — sobe o servidor (não colocar lógica aqui)
- `src/app.ts` — `buildApp()`: registra plugins e rotas
- `src/env.ts` — leitura de variáveis de ambiente; toda nova variável entra aqui **e** em `.env.example`
- `src/routes/<recurso>.ts` — um `FastifyPluginAsync` por recurso, registrado em `app.ts` com `{ prefix: "/api" }`
- `src/services/<recurso>.ts` — regra de negócio com banco (estoque, pedidos, transferência, compra, entrega, painéis)
- `src/domain/` — regras puras e erros; `src/auth/` — senha, sessão e guardas; `src/db/` — esquema, migração e seed; `src/contracts.ts` — tipos públicos

## Convenções

- Toda rota fica sob o prefixo `/api`.
- **Imports relativos terminam em `.js`** (`import { env } from "./env.js"`) — exigência do NodeNext.
- Valide `body`/`params`/`querystring` com o `schema` do Fastify (JSON Schema) em toda rota que recebe dados; defina o schema de resposta quando simples.
- Exporte os tipos de request/response: o frontend espelha esses contratos.
- Erros: `reply.code(4xx).send({ message })` ou erros do Fastify; nunca exponha stack.
- Use `app.log`, não `console.log`. Nunca logue dados pessoais de paciente (LGPD).
- Banco: PostgreSQL + Drizzle (`src/db/schema.ts`). Mudou o esquema → `pnpm db:generate` e commit da migração em `drizzle/`.
- Regra de negócio em `src/services/` dentro de `db.transaction`, travando com `.for("update")` o pedido/lote que vai mudar; situações do pedido só mudam por `setStatus` (que chama `assertTransition`).
- Regras puras (prioridade, lotes FEFO, validade de receita, distância) ficam em `src/domain/` e são testadas sem banco.
- Rotas protegidas usam `requireAuth` + `requireRole(...)`; o profissional só age na própria unidade, o fornecedor só nos pedidos dele, o entregador só nas entregas dele.
- Erros de regra: lance `ConflictError` (409), `ForbiddenError` (403), `NotFoundError` (404) ou `BadRequestError` (400) de `src/domain/errors.ts`.
- Testes: `pnpm test` (Vitest, banco `pi_test`; precisa do Postgres do `infra/compose.yaml`). Toda regra nova chega com teste que falhou antes.

## Monorepo

Este pacote faz parte do monorepo `PI1G6-LogFarma`. Regras para agentes, regras gerais, documentação obrigatória em `docs/` e todo o contexto do projeto (requisitos, fluxo, glossário, decisões em aberto) estão no `CLAUDE.md`/`AGENTS.md` da **raiz**.
