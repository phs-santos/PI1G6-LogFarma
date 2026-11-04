---
name: verificar
description: Roda typecheck e build do repositório e corrige os erros encontrados. Use antes de commit ou quando o usuário pedir para checar se está tudo funcionando.
---

Na raiz do repositório:

```bash
pnpm typecheck
pnpm build
```

Se algo falhar, leia o erro, corrija na origem (não silencie com `any`, `@ts-ignore` ou desativando regra) e rode de novo até passar.
Remova os artefatos gerados depois (`storybook-static`) — já estão no `.gitignore`.

Responda em uma linha se estiver tudo verde, ou liste o que foi corrigido.
