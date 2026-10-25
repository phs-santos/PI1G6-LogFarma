# Backend (`@fatec-pi/backend`)

Fastify 5 + TypeScript em ESM (`module: NodeNext`).

## Estrutura

- `src/server.ts` — sobe o servidor (não colocar lógica aqui)
- `src/app.ts` — `buildApp()`: registra plugins e rotas
- `src/env.ts` — leitura de variáveis de ambiente; toda nova variável entra aqui **e** em `.env.example`
- `src/routes/<recurso>.ts` — um `FastifyPluginAsync` por recurso, registrado em `app.ts` com `{ prefix: "/api" }`

## Convenções

- **Imports relativos terminam em `.js`** (`import { env } from "./env.js"`) — exigência do NodeNext.
- Valide `body`/`params`/`querystring` com o `schema` do Fastify (JSON Schema) em toda rota que recebe dados.
- Respostas de erro: use `reply.code(4xx).send({ message })` ou lance erros do Fastify; nunca exponha stack.
- Lógica de negócio fora do handler quando crescer: `src/services/<recurso>.ts`.
- Use `app.log` para logs, não `console.log`.
- Sem banco/ORM ainda — confirme com o usuário antes de escolher um.

## Verificação

```bash
pnpm --filter @fatec-pi/backend typecheck
pnpm dev:backend   # e teste com: curl localhost:3333/api/<rota>
```
