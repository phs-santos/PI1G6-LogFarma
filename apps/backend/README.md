# backend

API do sistema — Node + **Fastify 5** + TypeScript (ESM) + **PostgreSQL** (Drizzle ORM).

> Parte do monorepo [PI1G6-LogFarma](../../README.md) — contexto do projeto, como trabalhamos e equipe estão no README da raiz. O desenho completo está em [`docs/2026-11-03-backend-design.md`](../../docs/2026-11-03-backend-design.md).

## Começando

Requisitos: Node 24, pnpm 10 (`corepack enable`) e Docker (para o PostgreSQL). Rode o `pnpm install` na raiz do monorepo.

```bash
docker compose -f ../../infra/compose.yaml up -d db   # PostgreSQL local
../../infra/scripts/setup-dev.sh   # cria o .env único na raiz do monorepo
pnpm db:seed      # cria as tabelas e carrega a demonstração (apaga o banco de dev)
pnpm dev          # http://localhost:3333 — as migrações rodam ao iniciar
curl localhost:3333/api/health   # {"status":"ok"}
```

## Scripts

| Comando            | O que faz                                                               |
| ------------------ | ----------------------------------------------------------------------- |
| `pnpm dev`         | API em modo watch (`tsx`), lendo o `.env` da raiz                       |
| `pnpm test`        | Testes (Vitest) num banco `pi_test` criado automaticamente              |
| `pnpm typecheck`   | Tipos do código e dos testes                                            |
| `pnpm build`       | Compila para `dist/`                                                    |
| `pnpm start`       | Roda a versão compilada (migra ao iniciar)                              |
| `pnpm db:generate` | Gera a migração SQL depois de mudar `src/db/schema.ts`                  |
| `pnpm db:migrate`  | Aplica as migrações sem subir o servidor                                |
| `pnpm db:seed`     | **Zera** o banco e carrega a demonstração (em produção exige liberação) |

## Variáveis de ambiente

| Variável                  | Padrão                                                | Descrição                                               |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `PORT`                    | `3333`                                                | Porta da API                                            |
| `HOST`                    | `0.0.0.0`                                             | Interface de rede                                       |
| `CORS_ORIGIN`             | `http://localhost:5173`                               | Origem liberada para o frontend                         |
| `DATABASE_URL`            | — (obrigatória)                                       | Conexão do PostgreSQL                                   |
| `DATABASE_URL_TEST`       | `.../pi_test`                                         | Banco dos testes                                        |
| `JWT_SECRET`              | — (obrigatória)                                       | Assina o token de sessão                                |
| `COOKIE_SECURE`           | `false`                                               | `true` só com HTTPS                                     |
| `ALLOW_DEMO_SEED`         | `false`                                               | Libera o seed em produção (apaga tudo)                  |
| `DEMO_PASSWORD`           | `demo1234`                                            | Senha das contas da demonstração                        |
| `ADMIN_EMAIL`             | —                                                     | Primeiro gestor, criado ao iniciar se não houver nenhum |
| `ADMIN_PASSWORD`          | —                                                     | Senha dele (12+ caracteres em produção)                 |
| `ADMIN_NAME`              | `Administrador`                                       | Nome dele                                               |
| `SMTP_HOST`               | — (não envia)                                         | Servidor SMTP do e-mail de recuperar senha              |
| `SMTP_PORT`               | `465`                                                 | Porta (465/2465 SSL; 587/2587 STARTTLS)                 |
| `SMTP_SECURE`             | `true`                                                | `false` para 587/2587                                   |
| `SMTP_USER` / `SMTP_PASS` | —                                                     | Login do SMTP (segredo)                                 |
| `EMAIL_FROM`              | `LogFarma <nao-responda@logfarma.codexolimpo.com.br>` | Remetente                                               |
| `APP_URL`                 | o `CORS_ORIGIN`                                       | Endereço das telas nos links dos e-mails                |

Toda variável nova entra em `src/env.ts` **e** no [`.env.example`](../../.env.example) da raiz do monorepo.

## Estrutura

```
src/
  server.ts              # migra o banco e sobe o servidor
  app.ts                 # buildApp(): plugins, tratamento de erros e rotas
  env.ts                 # variáveis de ambiente
  contracts.ts           # tipos públicos (o frontend espelha)
  db/                    # esquema Drizzle, conexão, migrações e seed
  domain/                # regras puras: prioridade, lotes, receita, distância, situações do pedido
  services/              # regras com banco: estoque, pedidos, transferência, compra, entrega, painéis
  auth/                  # senha (argon2), sessão (cookie + JWT) e guardas por perfil
  routes/<recurso>.ts    # uma rota por recurso, sempre sob /api
drizzle/                 # migrações SQL (vão para a imagem Docker)
test/                    # testes de integração com app.inject e banco real
```

## Perfis e rotas

Sessão por cookie `httpOnly` (`logfarma_session`). Erros sempre como `{ message }`.

| Perfil                   | Rotas principais                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| todos                    | `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` · `GET /api/notifications` · `POST /api/notifications/:id/read` · `GET /api/medications?search=` · `GET /api/pharmacies` (pública)                                                                                                                                                                                      |
| paciente                 | `POST /api/auth/register` · `GET/PATCH /api/me` · `/api/me/caregivers` · `GET /api/medications/:id/availability` · `POST/GET /api/requests` · `GET/PATCH /api/requests/:id` · `POST /api/requests/:id/prescription`                                                                                                                                                                           |
| profissional da farmácia | `GET /api/pharmacy/requests` · `POST /api/pharmacy/requests/:id/actions` (`prepare`, `dispense`, `schedule_delivery`, `request_transfer`, `order_from_supplier`) · `POST /api/pharmacy/prescriptions/:id/check` · `/api/pharmacy/transfers` · `/api/pharmacy/purchase-orders` · `/api/pharmacy/waitlist` · `/api/pharmacy/deliveries` · `/api/pharmacy/stock` · `POST/PATCH /api/medications` |
| fornecedor               | `GET /api/supplier/purchase-orders` · `POST /api/supplier/purchase-orders/:id/actions` (`confirm`, `no_date`, `ship`)                                                                                                                                                                                                                                                                         |
| entregador               | `GET /api/courier/deliveries?scope=available\|mine` · `POST /api/courier/deliveries/:id/actions` (`accept`, `pick_up`, `deliver`, `fail`)                                                                                                                                                                                                                                                     |
| gestor                   | `POST /api/manager/users` · `GET /api/manager/unmet-demand` · `GET /api/manager/expiring-stock` · `POST/PATCH /api/medications`                                                                                                                                                                                                                                                               |

## Contas da demonstração

Criadas pelo `pnpm db:seed` (senha = `DEMO_PASSWORD`):

| Papel                           | E-mail                                                    |
| ------------------------------- | --------------------------------------------------------- |
| Dona Maria (paciente)           | `maria@demo.logfarma`                                     |
| Farmacêutica da UBS Centro      | `farmaceutico.centro@demo.logfarma`                       |
| Auxiliar da UBS Centro          | `auxiliar.centro@demo.logfarma`                           |
| Farmacêutica da UBS Jardim      | `farmaceutico.jardim@demo.logfarma`                       |
| Farmacêutico dos especializados | `farmaceutico.especializados@demo.logfarma`               |
| Fornecedor                      | `fornecedor@demo.logfarma`                                |
| Entregadores                    | `entregador1@demo.logfarma` · `entregador2@demo.logfarma` |
| Gestor                          | `gestor@demo.logfarma`                                    |

O roteiro das três cenas está no design e é executado de ponta a ponta em `test/scenes.test.ts`.

## Convenções

- Todas as rotas sob `/api`; imports relativos terminam em `.js` (`NodeNext`).
- Toda entrada validada com `schema` do Fastify.
- Regra de negócio em `services/` dentro de uma transação; mudanças de situação do pedido passam por `assertTransition`.
- Logs com `app.log`; nunca logar dados pessoais de paciente (LGPD). Avisos não levam dado clínico.
- Mudou o esquema? `pnpm db:generate` e commit da migração gerada em `drizzle/`.
