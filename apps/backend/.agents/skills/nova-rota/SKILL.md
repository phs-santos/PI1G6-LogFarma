---
name: nova-rota
description: Cria um endpoint novo no backend Fastify com validação e registro em app.ts. Use quando o usuário pedir uma rota/endpoint de API (ex. "/nova-rota GET /api/medicamentos").
---

Crie o endpoint `$ARGUMENTS` seguindo o `AGENTS.md`.

1. Se o usuário não informou body/resposta, defina um contrato razoável com base no glossário e deixe explícito no resumo.
2. Rota em `src/routes/<recurso>.ts` com `schema` de entrada (e de resposta quando simples), registrada em `src/app.ts` com prefixo `/api`.
3. Rode `pnpm typecheck`. Se possível, suba `pnpm dev` em background, teste com `curl localhost:3333/api/...` e encerre o processo.

Responda com: método, caminho, body, resposta, códigos de erro, os tipos TS do contrato e um `curl` de exemplo.
