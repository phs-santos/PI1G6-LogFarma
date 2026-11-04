# backend — Grupo PI 6

API do sistema (`@fatec-pi/backend`). Fastify 5 + TypeScript em ESM (`module: NodeNext`).

## Comandos

```bash
pnpm install
cp .env.example .env
pnpm dev          # http://localhost:3333 — teste com: curl localhost:3333/api/health
pnpm typecheck    # obrigatório antes de considerar pronto
pnpm build
```

## Estrutura

- `src/server.ts` — sobe o servidor (não colocar lógica aqui)
- `src/app.ts` — `buildApp()`: registra plugins e rotas
- `src/env.ts` — leitura de variáveis de ambiente; toda nova variável entra aqui **e** em `.env.example`
- `src/routes/<recurso>.ts` — um `FastifyPluginAsync` por recurso, registrado em `app.ts` com `{ prefix: "/api" }`
- `src/services/<recurso>.ts` — regra de negócio, quando o handler crescer

## Convenções

- Toda rota fica sob o prefixo `/api`.
- **Imports relativos terminam em `.js`** (`import { env } from "./env.js"`) — exigência do NodeNext.
- Valide `body`/`params`/`querystring` com o `schema` do Fastify (JSON Schema) em toda rota que recebe dados; defina o schema de resposta quando simples.
- Exporte os tipos de request/response: o frontend espelha esses contratos.
- Erros: `reply.code(4xx).send({ message })` ou erros do Fastify; nunca exponha stack.
- Use `app.log`, não `console.log`. Nunca logue dados pessoais de paciente (LGPD).
- Sem banco/ORM/autenticação ainda — confirme com o usuário antes de escolher. Na POC, dados simulados em memória.

## Monorepo

Este pacote faz parte do monorepo `PI1G6-LogFarma`. Regras para agentes, regras gerais, documentação obrigatória em `docs/` e todo o contexto do projeto (requisitos, fluxo, glossário, decisões em aberto) estão no `CLAUDE.md`/`AGENTS.md` da **raiz**.
