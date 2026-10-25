# Style-guide (`@fatec-pi/style-guide`)

Fonte única de verdade visual. Consumido pelo frontend direto do código-fonte (sem build).

## Estrutura

- `src/tokens/tokens.css` — CSS variables (cores, tipografia, espaçamento, raio, sombra)
- `src/tokens/index.ts` — espelho TS dos tokens; mantenha em sincronia com o CSS
- `src/components/<Nome>/` — `<Nome>.tsx`, `<Nome>.css`, `<Nome>.stories.tsx`
- `src/styles.css` — importa tokens + CSS de cada componente
- `src/index.ts` — exporta componentes e tipos públicos

## Checklist de componente novo

1. Pasta `src/components/<Nome>/` com os 3 arquivos.
2. Classes CSS no padrão BEM com prefixo `sg-`: `.sg-nome`, `.sg-nome__parte`, `.sg-nome--variante`.
3. CSS usa **somente** tokens `var(--...)`. Precisa de valor novo? Adicione token em `tokens.css` + `tokens/index.ts`.
4. Props estendem os atributos HTML nativos (`ButtonHTMLAttributes`, etc.) e repassam `...props` e `className`. Se houver conflito de nome (ex.: `title`), use `Omit<>`.
5. `@import` do CSS em `src/styles.css`.
6. Export do componente **e** dos tipos em `src/index.ts`.
7. Story com uma variação por estado/variante relevante (inclua `disabled` quando fizer sentido).
8. Acessibilidade: elemento semântico correto, foco visível, `aria-*` quando necessário.

## Verificação

```bash
pnpm --filter @fatec-pi/style-guide typecheck
pnpm --filter @fatec-pi/style-guide build   # build do Storybook
```
