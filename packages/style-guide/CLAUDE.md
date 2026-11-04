# style-guide — Grupo PI 6

Design system (`@fatec-pi/style-guide`): fonte única de verdade visual. Exporta o **código-fonte TS** direto (sem build); o frontend usa este pacote via workspace (`workspace:*`).

## Comandos

```bash
pnpm install
pnpm storybook    # http://localhost:6006
pnpm typecheck    # obrigatório antes de considerar pronto
pnpm build        # build do Storybook
```

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
8. Acessibilidade: elemento semântico, foco visível, `aria-*` quando necessário. Público é idoso/baixa visão: contraste alto, alvos de toque grandes, texto legível.

## Princípios

- Componentes genéricos: nada de regra de negócio, chamada de API ou texto específico de tela.
- API de props pequena e previsível (`variant`, `size`, `disabled`…), seguindo o padrão do `Button`.
- Mudança que quebra a API de um componente exportado precisa ser avisada ao time do frontend.

## Publicação para o frontend

Não há publicação: o frontend usa este pacote direto do workspace. Mudou aqui, o frontend já enxerga. Por isso, mudança que quebra a API de um componente deve ajustar o frontend no mesmo PR.

## Monorepo

Este pacote faz parte do monorepo `PI1G6-LogFarma`. Regras para agentes, regras gerais, documentação obrigatória em `docs/` e todo o contexto do projeto (requisitos, fluxo, glossário, decisões em aberto) estão no `CLAUDE.md`/`AGENTS.md` da **raiz**.
