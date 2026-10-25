# backend

API do sistema — Node + **Fastify 5** + TypeScript (ESM).

> Parte do projeto **Localização, Reposição e Entrega de Medicamentos**.

## Sobre o projeto

Sistema que mostra **em tempo real onde um medicamento essencial está disponível** na rede do Farmácia Popular (PFPB) e do SUS, indica a unidade mais próxima com rota e oferece alternativas quando o paciente não pode ir até lá: transferência entre unidades, entrega em casa ou lista de espera com alerta.

Projeto Integrador I — Análise e Desenvolvimento de Sistemas (noturno), **Fatec Taquaritinga**, 2026.
Orientador: Prof. Gabriel Passatuto Gallo.

## Repositórios

| Repositório | Papel | Porta |
|---|---|---|
| [frontend](https://github.com/Grupo-PI-6/frontend) | Telas do paciente e da farmácia (React + Vite) | 5173 |
| [backend](https://github.com/Grupo-PI-6/backend) | API e regras de negócio (Fastify) | 3333 |
| [style-guide](https://github.com/Grupo-PI-6/style-guide) | Design system: tokens, componentes e Storybook | 6006 |

```
style-guide ──(dependência git)──▶ frontend ──(/api via proxy do Vite)──▶ backend
```

## Começando

Requisitos: Node 20+ e pnpm 10 (`corepack enable`).

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

## Como trabalhamos

- Tarefas e features ficam no **[projeto da org](https://github.com/orgs/Grupo-PI-6/projects)**. Pegue um card, mova para *Em andamento* e se atribua.
- Nunca commite direto na `main`. Crie uma branch a partir dela:
  - `feat/<descricao-curta>` para funcionalidade nova
  - `fix/<descricao-curta>` para correção
  - `chore/<descricao-curta>` para configuração, docs e afins
- Commits em português, no imperativo: `adiciona busca de medicamento`, `corrige rota de estoque`.
- Abra um Pull Request para a `main`, cite o card/issue e o requisito (ex.: `RF01`), e peça revisão de alguém do grupo.
- Antes do PR: `pnpm typecheck` e `pnpm build` precisam passar.
- Feature que atravessa repos segue a ordem **style-guide → backend → frontend**.

## Usando IA (Claude Code / Codex)

O repositório já vem configurado para assistentes de código:

- `CLAUDE.md` / `AGENTS.md` — contexto do projeto, requisitos, glossário e regras deste repo. Leia também se você for humano 🙂
- `.claude/` — skills e agentes do Claude Code
- `.agents/` e `.codex/` — skills e agentes do Codex

## Equipe

- Arthur Vinicius Ferreira
- Bruno Henrique Jacinto
- Lorena Duarte Malaguti
- Paulo Henrique de Souza Santos
