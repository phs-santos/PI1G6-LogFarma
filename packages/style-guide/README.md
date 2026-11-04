# style-guide

Design system do projeto — tokens CSS, componentes **React** e **Storybook**.

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
pnpm storybook    # http://localhost:6006
```

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm storybook` | Storybook em modo dev |
| `pnpm typecheck` | Checa os tipos |
| `pnpm build` | Build estático do Storybook em `storybook-static/` |

## Componentes

| Componente | Descrição |
|---|---|
| `Button` | Botão com variantes e tamanhos |
| `Card` | Container com título opcional |

Veja todos com exemplos no Storybook.

## Como o frontend usa

Não há registry: o frontend instala este repositório direto do GitHub.

```bash
pnpm add "git+ssh://git@github.com/Grupo-PI-6/style-guide.git#main"
```

```ts
import "@fatec-pi/style-guide/styles.css";
import { Button, Card } from "@fatec-pi/style-guide";
```

O pacote exporta o **código-fonte TypeScript** (sem build). Depois que algo entra na `main` daqui, o frontend atualiza com `pnpm update @fatec-pi/style-guide`.

## Estrutura

```
src/
  tokens/tokens.css      # CSS variables (cores, tipografia, espaçamento…)
  tokens/index.ts        # espelho TS dos tokens
  components/<Nome>/     # <Nome>.tsx + <Nome>.css + <Nome>.stories.tsx
  styles.css             # importa tokens + CSS dos componentes
  index.ts               # exports públicos
```

## Criando um componente

1. Pasta `src/components/<Nome>/` com `.tsx`, `.css` e `.stories.tsx`.
2. Classes BEM com prefixo `sg-` (`.sg-nome`, `.sg-nome__parte`, `.sg-nome--variante`).
3. CSS só com tokens `var(--...)`. Precisa de valor novo? Crie o token em `tokens.css` e `tokens/index.ts`.
4. Props estendem os atributos HTML nativos e repassam `...props` e `className`.
5. Importe o CSS em `src/styles.css` e exporte componente + tipos em `src/index.ts`.
6. Story para cada variante/estado.
7. Acessibilidade: elemento semântico, foco visível, contraste alto, alvos de toque grandes.

Mudança que quebra a API de um componente? Avise o time do frontend no PR.

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
