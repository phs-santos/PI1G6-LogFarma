# backend

API do sistema — Node + **Fastify 5** + TypeScript (ESM).

> Parte do monorepo [PI1G6-LogFarma](../../README.md) — contexto do projeto, como trabalhamos e equipe estão no README da raiz.

## Começando

Requisitos: Node 24 e pnpm 10 (`corepack enable`). Rode o `pnpm install` na raiz do monorepo.

```bash
pnpm install
cp .env.example .env
pnpm dev
curl localhost:3333/api/health   # {"status":"ok"}
```

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe a API em modo watch (`tsx`) |
| `pnpm typecheck` | Checa os tipos |
| `pnpm build` | Compila para `dist/` |
| `pnpm start` | Roda a versão compilada |

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3333` | Porta da API |
| `HOST` | `0.0.0.0` | Interface de rede |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem liberada para o frontend |

Toda variável nova entra em `src/env.ts` **e** em `.env.example`.

## Estrutura

```
src/
  server.ts          # sobe o servidor
  app.ts             # buildApp(): plugins e registro de rotas
  env.ts             # variáveis de ambiente
  routes/<recurso>.ts    # uma rota por recurso, sempre sob /api
  services/<recurso>.ts  # regra de negócio (quando crescer)
```

## Convenções

- Todas as rotas sob `/api`.
- Imports relativos terminam em `.js` (exigência do `NodeNext`).
- Toda entrada validada com `schema` do Fastify.
- Logs com `app.log`; nunca logar dados pessoais de paciente (LGPD).
- Banco de dados e autenticação ainda não definidos — por enquanto, dados simulados em memória.

## Endpoints

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/api/health` | Status da API |
