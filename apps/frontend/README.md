# frontend

Telas do sistema — **React 19** + Vite + TypeScript.

> Parte do monorepo [PI1G6-LogFarma](../../README.md) — contexto do projeto, como trabalhamos e equipe estão no README da raiz.

## Começando

Requisitos: Node 24 e pnpm 10 (`corepack enable`). Rode o `pnpm install` na raiz do monorepo.

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

Para a tela conversar com a API, suba também o backend (`pnpm dev` na raiz sobe os dois). Em dev, tudo que vai para `/api/*` é redirecionado para `localhost:3333`.

## Scripts

| Comando          | O que faz                                               |
| ---------------- | ------------------------------------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento                             |
| `pnpm typecheck` | Checa os tipos                                          |
| `pnpm build`     | Build de produção em `dist/`                            |
| `pnpm preview`   | Serve o build localmente                                |
| `pnpm test`      | Testes das telas (Vitest + Testing Library + axe)       |
| `pnpm e2e`       | As três cenas no navegador (Playwright, banco `pi_e2e`) |

Primeira vez no e2e: `pnpm exec playwright install chromium`. O Postgres do `infra/compose.yaml` precisa estar de pé.

## Style-guide

Os componentes visuais vêm de `@fatec-pi/style-guide`:

```ts
import "@fatec-pi/style-guide/styles.css";
import { Button, Tarja, Timeline } from "@fatec-pi/style-guide";
```

- Precisa de um componente genérico que não existe (Input, Modal…)? Ele é criado em **`packages/style-guide`**, não aqui.
- O style-guide entra como `workspace:*`: editou lá, a tela atualiza na hora.

## Estrutura

```
src/
  main.tsx, App.tsx    # entrada: QueryClient + RouterProvider
  api/                 # acesso à API, um arquivo por recurso; types.ts espelha os contratos do backend
  app/                 # rotas (router.tsx), sessão, guarda de perfil, chaves de cache, foco e título
    layouts/           # celular (paciente, entregador) e computador (farmácia, fornecedor, gestor)
  pages/<perfil>/      # telas: entrar, paciente, farmacia, entregador, fornecedor, gestor, comum
  ui/                  # peças do app que dependem de rota ou de dados (Loaded, LinkButton, InlineText…)
  lib/                 # formatação de data, telefone, distância
test/                  # renderApp/renderWithApp, mockApi (fetch falso), dados de exemplo
e2e/                   # Playwright: as três cenas da apresentação
```

Bibliotecas aprovadas pelo grupo: React Router e TanStack Query (dados), Vitest + Testing Library + vitest-axe (testes), Playwright + @axe-core/playwright (e2e).

## Convenções

- Sem cores ou tamanhos fixos: use os tokens (`var(--space-*)`, `var(--color-*)`).
- Nada de `fetch` dentro de componente — use as funções de `src/api/`.
- Toda tela que busca dados trata carregamento, erro e vazio (use `Loaded` de `src/ui`).
- Toda tela chama `usePageTitle("…")`; o foco vai para o `h1` ao trocar de tela.
- Telas "ao vivo" consultam a cada 3 s (`LIVE`), as demais a cada 30 s (`REGULAR`).
- Teste primeiro: cada tela tem `.test.tsx` com o caminho principal e axe.
- Público principal: idosos e pessoas com pouca familiaridade com apps. Textos claros, poucos passos, contraste alto.
