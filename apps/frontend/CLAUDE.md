# Frontend (`@fatec-pi/frontend`)

React 19 + Vite + TypeScript. Entrada em `src/main.tsx`, componente raiz em `src/App.tsx`.

## Convenções

- Componentes funcionais com export nomeado (`export function Pagina()`), um por arquivo, PascalCase.
- Estrutura conforme crescer:
  - `src/pages/` — telas (uma pasta por página)
  - `src/features/<dominio>/` — lógica e componentes específicos de um domínio
  - `src/api/` — funções de acesso à API (`fetch` tipado), nunca `fetch` direto dentro de componente
  - `src/hooks/` — hooks reutilizáveis
- UI: importe de `@fatec-pi/style-guide`. Se precisar de um componente genérico que não existe (Input, Modal…), crie no style-guide primeiro.
- Estilo local mínimo: layout (grid/flex/margens) é ok aqui, sempre com tokens `var(--space-*)`.
- Chamadas à API usam `/api/...` relativo.
- Sem bibliotecas novas (router, estado global, query) sem confirmar com o usuário.

## Verificação

```bash
pnpm --filter @fatec-pi/frontend typecheck
pnpm --filter @fatec-pi/frontend build
```
