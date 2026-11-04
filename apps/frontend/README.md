# frontend

Telas do sistema — **React 19** + Vite + TypeScript.

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

Requisitos: Node 20+ e pnpm 10 (`corepack enable`). Também é preciso ter uma **chave SSH cadastrada no GitHub** com acesso à org `Grupo-PI-6`: o style-guide é instalado direto do repositório privado.

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Para a tela conversar com a API, suba também o [backend](https://github.com/Grupo-PI-6/backend). Em dev, tudo que vai para `/api/*` é redirecionado para `localhost:3333`.

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm typecheck` | Checa os tipos |
| `pnpm build` | Build de produção em `dist/` |
| `pnpm preview` | Serve o build localmente |
| `pnpm update @fatec-pi/style-guide` | Puxa a última versão da `main` do style-guide |

## Style-guide

Os componentes visuais vêm de `@fatec-pi/style-guide`:

```ts
import "@fatec-pi/style-guide/styles.css";
import { Button, Card } from "@fatec-pi/style-guide";
```

- Precisa de um componente genérico que não existe (Input, Modal…)? Ele é criado no repo **style-guide**, não aqui.
- Mexendo nos dois ao mesmo tempo? Clone o style-guide ao lado e rode `pnpm link ../style-guide`. Para voltar: `pnpm unlink @fatec-pi/style-guide && pnpm install`. Não commite o `package.json` com `link:`.

## Estrutura

```
src/
  main.tsx           # entrada
  App.tsx            # componente raiz
  pages/             # telas (uma pasta por página)
  features/<dominio>/  # lógica e componentes de um domínio
  api/               # funções de acesso à API (fetch tipado)
  hooks/             # hooks reutilizáveis
```

## Convenções

- Sem cores ou tamanhos fixos: use os tokens (`var(--space-*)`, `var(--color-*)`).
- Nada de `fetch` dentro de componente — use as funções de `src/api/`.
- Toda tela que busca dados trata carregamento, erro e vazio.
- Público principal: idosos e pessoas com pouca familiaridade com apps. Textos claros, poucos passos, contraste alto.

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
