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

| Comando          | O que faz                                               |
| ---------------- | ------------------------------------------------------- |
| `pnpm storybook` | Storybook em modo dev                                   |
| `pnpm typecheck` | Checa os tipos                                          |
| `pnpm build`     | Build estático do Storybook em `storybook-static/`      |
| `pnpm test`      | Testes dos componentes (Vitest + Testing Library + axe) |

## Identidade: "Receituário e tarja"

Tinta azul de caneta (`--color-ink`), papel branco, a tarja vermelha ou preta da caixa do remédio e carimbos de situação. Letra **Atkinson Hyperlegible** (feita para baixa visão), base de 20 px no celular (`.sg-mobile`), alvos de toque de 56 px no celular e 44 px no computador, foco sempre visível e nada que dependa só de cor. Detalhes em [docs/2026-11-04-frontend-design.md](../../docs/2026-11-04-frontend-design.md).

## Componentes

| Componente                             | Descrição                                                            |
| -------------------------------------- | -------------------------------------------------------------------- |
| `Button` (+ `buttonClassName`)         | Botão com variantes, tamanhos, `block` e `loading` ("Enviando…")     |
| `Card`                                 | Seção com título                                                     |
| `Tarja`                                | Tipo de receita com a faixa da caixa do remédio (texto sempre junto) |
| `Stamp`                                | Carimbo curto: "Tem", "Em falta", "Vence em 20 dias"                 |
| `Notice`                               | Aviso em destaque (sucesso, atenção, erro, informação)               |
| `ActionList`                           | Pilha de botões grandes                                              |
| `Timeline`                             | Linha do tempo do pedido, passo atual destacado                      |
| `EmptyState`, `ErrorState`, `Spinner`  | Vazio, erro com "Tentar de novo", carregando                         |
| `TextField`, `SelectField`, `Checkbox` | Campos com rótulo, dica e erro ligados                               |
| `SearchField`                          | Busca com sugestões (combobox acessível)                             |
| `ChoiceGroup`, `ChoiceOption`          | Escolha única em cartões grandes                                     |
| `ConfirmDialog`                        | Pergunta de confirmação no `<dialog>` nativo                         |
| `Tabs`                                 | Abas do computador com contador                                      |
| `ListDetail`                           | Lista à esquerda, detalhe à direita                                  |
| `DataTable`                            | Tabela com legenda e texto de vazio                                  |
| `StatTile`, `BarList`                  | Número grande e barras com o valor escrito                           |
| `AppHeader`                            | Topo azul do computador                                              |

Veja todos com exemplos no Storybook. Cada componente tem `.test.tsx` (comportamento e axe).

## Como o frontend usa

Não há registry: o frontend usa este pacote direto do workspace (`apps/frontend/package.json`):

```json
"@fatec-pi/style-guide": "workspace:*"
```

```ts
import "@fatec-pi/style-guide/styles.css";
import { Button, Tarja, Timeline } from "@fatec-pi/style-guide";
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

1. Pasta `src/components/<Nome>/` com `.tsx`, `.css`, `.stories.tsx` e `.test.tsx` (escreva o teste primeiro).
2. Classes BEM com prefixo `sg-` (`.sg-nome`, `.sg-nome__parte`, `.sg-nome--variante`).
3. CSS só com tokens `var(--...)`. Precisa de valor novo? Crie o token em `tokens.css` e `tokens/index.ts`.
4. Props estendem os atributos HTML nativos e repassam `...props` e `className`.
5. Importe o CSS em `src/styles.css` e exporte componente + tipos em `src/index.ts`.
6. Story para cada variante/estado.
7. Acessibilidade: elemento semântico, foco visível, contraste alto, alvos de toque grandes.

Mudança que quebra a API de um componente? Avise o time do frontend no PR.
