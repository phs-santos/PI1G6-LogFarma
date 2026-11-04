# frontend — Grupo PI 6

Telas do sistema (`@fatec-pi/frontend`). React 19 + Vite + TypeScript. Entrada em `src/main.tsx`, componente raiz em `src/App.tsx`.

## Comandos

```bash
pnpm install      # na raiz do monorepo
pnpm dev          # http://localhost:5173 — /api/* vai para o backend em localhost:3333
pnpm typecheck    # obrigatório antes de considerar pronto
pnpm build
```

Para rodar a tela completa, suba também o backend: `pnpm dev` na raiz sobe os dois.

## Convenções

- Componentes funcionais com export nomeado (`export function Pagina()`), um por arquivo, PascalCase.
- Estrutura conforme crescer:
  - `src/pages/` — telas (uma pasta por página)
  - `src/features/<dominio>/` — lógica e componentes específicos de um domínio
  - `src/api/` — funções de acesso à API (`fetch` tipado, tipos espelhando o contrato do backend); nunca `fetch` direto dentro de componente
  - `src/hooks/` — hooks reutilizáveis
- UI **só** via `@fatec-pi/style-guide`. Se faltar um componente genérico (Input, Modal…), **pare** e informe qual componente e props são necessários — ele nasce em `packages/style-guide`, não aqui.
- Estilo local mínimo: layout (grid/flex/margens) é ok, sempre com tokens `var(--space-*)`. Nada de hex/px soltos.
- Chamadas à API usam caminho relativo `/api/...`.
- Trate carregamento, erro e vazio em toda tela que busca dados.
- Pense no público (idosos, baixa visão, pouca familiaridade com apps): textos claros, poucos passos, contraste alto.
- Sem bibliotecas novas (router, estado global, query) sem confirmar com o usuário.

## Trabalhando no style-guide ao mesmo tempo

O style-guide está em `packages/style-guide` e entra como `workspace:*`: edite lá e a mudança aparece aqui na hora. Não use `pnpm link` nem dependência git.

## Monorepo

Este pacote faz parte do monorepo `PI1G6-LogFarma`. Regras para agentes, regras gerais, documentação obrigatória em `docs/` e todo o contexto do projeto (requisitos, fluxo, glossário, decisões em aberto) estão no `CLAUDE.md`/`AGENTS.md` da **raiz**.
