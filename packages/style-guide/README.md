# style-guide

Design system do projeto — tokens CSS, componentes **React** e **Storybook**.

> Parte do monorepo [PI1G6-LogFarma](../../README.md) — contexto do projeto, como trabalhamos e equipe estão no README da raiz.

## Começando

Requisitos: Node 24 e pnpm 10 (`corepack enable`). Rode o `pnpm install` na raiz do monorepo.

```bash
pnpm install
pnpm storybook    # http://localhost:6006
```

## Scripts

| Comando          | O que faz                                          |
| ---------------- | -------------------------------------------------- |
| `pnpm storybook` | Storybook em modo dev                              |
| `pnpm typecheck` | Checa os tipos                                     |
| `pnpm build`     | Build estático do Storybook em `storybook-static/` |

## Componentes

| Componente | Descrição                      |
| ---------- | ------------------------------ |
| `Button`   | Botão com variantes e tamanhos |
| `Card`     | Container com título opcional  |

Veja todos com exemplos no Storybook.

## Como o frontend usa

Não há registry: o frontend usa este pacote direto do workspace (`apps/frontend/package.json`):

```json
"@fatec-pi/style-guide": "workspace:*"
```

```ts
import "@fatec-pi/style-guide/styles.css";
import { Button, Card } from "@fatec-pi/style-guide";
```

O pacote exporta o **código-fonte TypeScript** (sem build). Qualquer mudança aqui aparece no frontend na hora; se quebrar a API de um componente, ajuste o frontend no mesmo PR.

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
