---
name: nova-pagina
description: Cria uma tela nova no frontend. Use quando o usuário descrever uma tela ou fluxo (ex. "/nova-pagina busca de medicamento").
---

Implemente a tela `$ARGUMENTS`.

1. **Planeje** (sem editar): liste os componentes de UI necessários e quais já existem em `node_modules/@fatec-pi/style-guide/src/index.ts`; liste os endpoints necessários. Mostre o plano curto ao usuário.
2. Se faltar componente genérico no style-guide ou endpoint no backend, **pare** e diga exatamente o que precisa ser criado em cada repo (nome, props / método, caminho, contrato).
3. Implemente a tela: página em `src/pages/`, acesso à API em `src/api/`, estados de carregamento/erro/vazio.
4. Rode `pnpm typecheck && pnpm build`, depois use o agente `reviewer` e corrija os itens 🔴 e 🟡.

Resuma o que foi feito e como testar (`pnpm dev`, URL).
