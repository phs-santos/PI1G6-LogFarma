# API em domínio próprio e sites liberados

- **Implementado em:** 2026-11-17
- **Última alteração:** —
- **Requisitos:** RNF03, RNF04

## Em poucas palavras

Antes, cada site com as telas do LogFarma tinha o seu próprio "estoque" (backend e banco). O site do professor abriu com as prateleiras vazias e ninguém conseguia entrar. Agora a API ganha um endereço próprio, `api.logfarma.codexolimpo.com.br`, como um balcão central que atende vários sites. Na porta fica um segurança com uma lista de convidados: só os sites da lista são atendidos. Os outros ouvem "este site não tem permissão".

## O que

- **Frontend:** o endereço da API vem de `VITE_API_URL`. Vazio (padrão), as telas continuam chamando `/api` no próprio domínio. Com valor, chamam a API no outro domínio.
- **Sessão pelo cabeçalho:** login e cadastro devolvem também um `token`. O frontend guarda esse token no navegador (`localStorage`, chave `logfarma_token`) e manda em toda chamada (`Authorization: Bearer`). Ele é apagado ao sair e em qualquer 401. O cookie httpOnly continua valendo para quem está no mesmo domínio.
- **Backend:** `requireAuth` aceita o cabeçalho Bearer e, sem ele, o cookie. `CORS_ORIGIN` aceita uma lista separada por vírgula. Uma chamada de navegador vinda de um site fora da lista recebe **403**, até no preflight. A própria tela, servida no mesmo domínio da API, sempre passa.
- **Infra:** `EXTRA_CORS_ORIGINS` no `.env` da VPS (soma ao `PUBLIC_URL`) e `ARG VITE_API_URL` no Dockerfile do frontend. O passo a passo do domínio `api.` está no `infra/README.md`.

## Por que

O professor publicou as telas em `https://projetointegrador.app.br/logfarma` com um backend próprio e um banco vazio, e o login dava "E-mail ou senha incorretos.". A ideia é todos os sites usarem a mesma API e o mesmo banco, e só os sites escolhidos poderem chamá-la.

## Onde

- `apps/backend/src/env.ts`: `corsOrigins` (lista) e `appUrl` (usa o primeiro da lista)
- `apps/backend/src/app.ts`: `isAllowedOrigin` e o gancho `onRequest` que devolve 403
- `apps/backend/src/auth/session.ts`, `auth/guards.ts`, `routes/auth.ts`: token no corpo e Bearer
- `apps/frontend/src/api/client.ts`: `API_BASE`, `setSessionToken` e cabeçalho `Authorization`
- `apps/frontend/src/api/auth.ts`: guarda o token no login e no cadastro e apaga ao sair
- `apps/frontend/src/vite-env.d.ts`, `apps/frontend/Dockerfile`: `VITE_API_URL`
- `infra/compose.prod.yaml`, `infra/.env.prod.example`, `infra/README.md`, `.env.example`
- Testes: `apps/backend/test/api-dominio.test.ts`, `apps/frontend/src/api/auth.test.ts`

## Escolhas feitas

| Escolha                                      | Alternativas consideradas                                    | Motivo                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token no cabeçalho `Authorization`           | Cookie `SameSite=None`; proxy no servidor do professor       | O cookie entre sites é bloqueado pelo Safari (iPhone) e pode ser pelo Chrome, e o login não ficaria salvo. Decisão do Paulo em 2026-11-17                     |
| Token no `localStorage`                      | `sessionStorage`; só em memória                              | Continua logado ao fechar e abrir a aba, como era com o cookie (vale 8 h). Troca aceita: um token legível por JavaScript fica mais exposto a XSS              |
| Manter também o cookie httpOnly              | Tirar o cookie                                               | Quem usa o mesmo domínio continua como antes; o cookie é o caminho de reserva quando o navegador não deixa guardar o token                                    |
| 403 para site fora da lista (além do CORS)   | Só o CORS do navegador                                       | O CORS só esconde a resposta, e o pedido chegaria a rodar. O 403 barra antes. Chamada sem `Origin` (curl, healthcheck) segue: quem protege os dados é o login |
| Mesmo domínio passa sempre                   | Exigir todo domínio na lista                                 | Não quebra o teste pelo celular na rede local (`http://192.168...:5173`) nem um domínio novo das nossas telas                                                 |
| `api.` vai para a porta do nginx do frontend | Expor a porta do backend                                     | O nginx já repassa `/api/` ao backend; o backend continua sem porta pública e o compose não muda                                                              |
| Nossa imagem continua sem `VITE_API_URL`     | Mudar o workflow para as nossas telas também chamarem `api.` | Nosso site não precisa: chama `/api` no próprio domínio. O workflow não foi alterado                                                                          |

## Como testar

- `pnpm --filter @fatec-pi/backend test`: `api-dominio.test.ts` (token no corpo, Bearer, 401 com token inválido, CORS do site liberado, 403 fora da lista e no preflight, mesmo domínio passa).
- `pnpm --filter @fatec-pi/frontend test`: `auth.test.ts` (token guardado e enviado, apagado ao sair e no 401).
- Depois do deploy: `curl -i -H "Origin: https://projetointegrador.app.br" https://api.logfarma.codexolimpo.com.br/api/health` traz `access-control-allow-origin`. Com outro `Origin`, 403.

## Histórico de alterações

| Data       | O que mudou    |
| ---------- | -------------- |
| 2026-11-17 | Versão inicial |
