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
- Estrutura:
    - `src/api/` — acesso à API (`apiFetch` tipado, `types.ts` espelhando os contratos do backend); nunca `fetch` direto dentro de componente
    - `src/app/` — rotas (`router.tsx`), sessão (`session.tsx`: 401 → Entrar com "Sua sessão terminou"), `RequireRole`, `queryKeys` (`LIVE` 3 s, `REGULAR` 30 s), `useActionMutation` (botão com "Enviando…" e trava de toque duplo), `usePageTitle`
    - `src/pages/<perfil>/` — telas (`paciente`, `farmacia`, `entregador`, `fornecedor`, `gestor`, `entrar`, `comum`)
    - `src/ui/` — peças do app que dependem de rota ou de dados (`Loaded`, `LinkButton`, `InlineText`, `PrescriptionFields`); nada genérico aqui
    - `test/` — `renderApp`/`renderWithApp`, `mockApi` (fetch falso), fixtures; `e2e/` — Playwright
- UI **só** via `@fatec-pi/style-guide`. Se faltar um componente genérico (Input, Modal…), **pare** e informe qual componente e props são necessários — ele nasce em `packages/style-guide`, não aqui.
- Estilo local mínimo: layout (grid/flex/margens) é ok, sempre com tokens `var(--space-*)`. Nada de hex/px soltos.
- Chamadas à API usam caminho relativo `/api/...`.
- Trate carregamento, erro e vazio em toda tela que busca dados.
- Pense no público (idosos, baixa visão, pouca familiaridade com apps): textos claros, poucos passos, contraste alto.
- Bibliotecas aprovadas: React Router, TanStack Query, Vitest + Testing Library + vitest-axe, Playwright + @axe-core/playwright. Outras, só confirmando com o usuário.
- Testes: `pnpm test` (toda tela com teste e axe) e `pnpm e2e` (cenas; banco `pi_e2e`, portas 3334/5174).

## Trabalhando no style-guide ao mesmo tempo

O style-guide está em `packages/style-guide` e entra como `workspace:*`: edite lá e a mudança aparece aqui na hora. Não use `pnpm link` nem dependência git.

## Monorepo

Este pacote faz parte do monorepo `PI1G6-LogFarma`. Regras para agentes, regras gerais, documentação obrigatória em `docs/` e todo o contexto do projeto (requisitos, fluxo, glossário, decisões em aberto) estão no `CLAUDE.md`/`AGENTS.md` da **raiz**.
