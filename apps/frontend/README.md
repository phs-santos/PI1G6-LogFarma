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

| Comando          | O que faz                    |
| ---------------- | ---------------------------- |
| `pnpm dev`       | Servidor de desenvolvimento  |
| `pnpm typecheck` | Checa os tipos               |
| `pnpm build`     | Build de produção em `dist/` |
| `pnpm preview`   | Serve o build localmente     |

## Style-guide

Os componentes visuais vêm de `@fatec-pi/style-guide`:

```ts
import "@fatec-pi/style-guide/styles.css";
import { Button, Card } from "@fatec-pi/style-guide";
```

- Precisa de um componente genérico que não existe (Input, Modal…)? Ele é criado em **`packages/style-guide`**, não aqui.
- O style-guide entra como `workspace:*`: editou lá, a tela atualiza na hora.

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
