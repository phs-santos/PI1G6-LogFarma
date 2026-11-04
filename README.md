# PI1G6-LogFarma

Monorepo do projeto **Localização, Reposição e Entrega de Medicamentos** — backend, frontend, design system e infraestrutura num só lugar.

## Sobre o projeto

Sistema que mostra **em tempo real onde um medicamento essencial está disponível** na rede do Farmácia Popular (PFPB) e do SUS, indica a unidade mais próxima com rota e oferece alternativas quando o paciente não pode ir até lá: transferência entre unidades, entrega em casa ou lista de espera com alerta.

Projeto Integrador I — Análise e Desenvolvimento de Sistemas (noturno), **Fatec Taquaritinga**, 2026.
Orientador: Prof. Gabriel Passatuto Gallo.

## Estrutura

| Pasta                                          | O que é                                          | Porta |
| ---------------------------------------------- | ------------------------------------------------ | ----- |
| [`apps/frontend`](apps/frontend)               | Telas do paciente e da farmácia (React + Vite)   | 5173  |
| [`apps/backend`](apps/backend)                 | API e regras de negócio (Fastify)                | 3333  |
| [`packages/style-guide`](packages/style-guide) | Design system: tokens, componentes e Storybook   | 6006  |
| [`infra`](infra)                               | Docker Compose (dev e produção), deploy e backup | —     |
| [`docs`](docs)                                 | Registro do que foi feito, por que e quando      | —     |

```
packages/style-guide ──(workspace:*)──▶ apps/frontend ──(/api via proxy do Vite)──▶ apps/backend
```

## Começando

Requisitos: Node 24 e pnpm 10 (`corepack enable`). Para o ambiente completo com banco: Docker.

```bash
pnpm install
./infra/scripts/setup-dev.sh   # cria o .env (um só, na raiz)
pnpm dev                       # backend (3333) + frontend (5173)
```

Ou tudo no Docker, com PostgreSQL:

```bash
pnpm docker:dev
```

## Scripts (na raiz)

| Comando                                  | O que faz                                  |
| ---------------------------------------- | ------------------------------------------ |
| `pnpm dev`                               | Backend + frontend em modo desenvolvimento |
| `pnpm dev:backend` / `pnpm dev:frontend` | Só um dos dois                             |
| `pnpm storybook`                         | Storybook do style-guide                   |
| `pnpm typecheck`                         | Checa os tipos de todos os pacotes         |
| `pnpm build`                             | Build de todos os pacotes                  |
| `pnpm docker:dev`                        | Sobe banco + backend + frontend no Docker  |

Para um pacote só: `pnpm --filter @fatec-pi/backend <script>`.

## Como trabalhamos

- Tarefas e features ficam no **[projeto da org](https://github.com/orgs/Grupo-PI-6/projects)**. Pegue um card, mova para _Em andamento_ e se atribua.
- Nunca commite direto na `main`. Crie uma branch a partir dela:
    - `feat/<descricao-curta>` para funcionalidade nova
    - `fix/<descricao-curta>` para correção
    - `chore/<descricao-curta>` para configuração, docs e afins
- Commits em português, no imperativo: `adiciona busca de medicamento`, `corrige rota de estoque`.
- Abra um Pull Request para a `main`, cite o card/issue e o requisito (ex.: `RF01`), e peça revisão de alguém do grupo.
- Antes do PR: `pnpm typecheck` e `pnpm build` (na raiz) precisam passar.
- Feature que atravessa pacotes segue a ordem **style-guide → backend → frontend** — agora pode ir tudo no mesmo PR.
- Documente o que fez em [`docs/`](docs/README.md): o que, por que, onde, escolhas e datas.

## Usando IA (Claude Code / Codex)

- `CLAUDE.md` / `AGENTS.md` na raiz — contexto do projeto, requisitos, glossário e **regras do que os agentes podem fazer**.
- `CLAUDE.md` / `AGENTS.md` em cada pacote — convenções específicas daquele pacote.
- `.claude/`, `.agents/` e `.codex/` em cada pacote — skills e agentes.

## Equipe

- Arthur Vinicius Ferreira
- Bruno Henrique Jacinto
- Lorena Duarte Malaguti
- Paulo Henrique de Souza Santos
