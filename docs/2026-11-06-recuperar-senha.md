# Recuperar senha pelo app

- **Implementado em:** 2026-11-06
- **Última alteração:** —
- **Requisitos:** RNF03

## Em poucas palavras

Antes, quem esquecia a senha tinha de ir ao balcão do posto, como perder a chave de casa e precisar ir até a imobiliária. Agora o app manda uma "chave reserva" por e-mail: um link que abre uma vez só e vence em 30 minutos. Quem pede não fica sabendo se o e-mail tem conta (a resposta é sempre a mesma), e o carteiro pode ser qualquer serviço de e-mail, porque o sistema fala SMTP, a "língua" comum dos correios eletrônicos.

## O que

- **Telas:** "Esqueceu a senha? **Recuperar conta**" na tela Entrar (paciente e equipe) leva a `/recuperar-conta`. O link do e-mail abre `/nova-senha?codigo=...`, onde a pessoa digita a nova senha duas vezes. Ao salvar, volta para Entrar com o aviso "Senha nova salva. Entre com ela."
- **API:**
    - `POST /api/auth/password/forgot` `{ email }` → sempre `200 { ok: true }`. Se o e-mail tem conta ativa, cria um código e manda o link.
    - `POST /api/auth/password/reset` `{ token, password }` → `200 { ok: true }` ou `400` "Este link de recuperação não vale mais. Peça um novo."
- **Banco:** tabela `password_reset_tokens` (migração `0003_password_reset_tokens.sql`), que guarda só o **hash SHA-256** do código, a validade e quando foi usado.
- **E-mail:** `src/services/mailer.ts` envia por SMTP com o `nodemailer`. Sem `SMTP_HOST`, não envia nada: em desenvolvimento escreve o texto do e-mail (com o link) no log; em produção só avisa que o SMTP não está configurado.
- **Prazos da receita:** saíram do `.env` (ver histórico do [backend](2026-11-03-backend.md)).

## Por que

Feedback da Malagueta ([feedback](2026-11-06-feedback-malagueta.md)): mandar a pessoa ao posto para recuperar a senha tira o sentido de um app prático, ainda mais para quem tem pouca mobilidade.

## Onde

- `apps/backend/src/services/password-reset.ts` — gera e confere o código, troca a senha
- `apps/backend/src/services/mailer.ts` — carteiro SMTP (ou só log)
- `apps/backend/src/routes/auth.ts` — as duas rotas
- `apps/backend/src/db/schema.ts` + `drizzle/0003_password_reset_tokens.sql` — tabela
- `apps/backend/src/env.ts`, `.env.example`, `infra/.env.prod.example`, `infra/compose.yaml`, `infra/compose.prod.yaml`, `infra/README.md` — variáveis de SMTP
- `apps/frontend/src/pages/entrar/RecuperarConta.tsx`, `NovaSenha.tsx`, `Entrar.tsx`, `src/app/router.tsx`, `src/api/auth.ts`
- Testes: `apps/backend/test/password-reset.test.ts` (8), `apps/frontend/src/pages/entrar/RecuperarConta.test.tsx` (7)

## Variáveis de ambiente

| Variável      | Padrão                                                | Para quê                                                            |
| ------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| `SMTP_HOST`   | vazio (não envia)                                     | Servidor SMTP                                                       |
| `SMTP_PORT`   | `465`                                                 | Porta                                                               |
| `SMTP_SECURE` | `true`                                                | `true` para 465/2465 (SSL direto); `false` para 587/2587 (STARTTLS) |
| `SMTP_USER`   | vazio                                                 | Usuário                                                             |
| `SMTP_PASS`   | vazio                                                 | Senha (segredo: só no `.env`)                                       |
| `EMAIL_FROM`  | `LogFarma <nao-responda@logfarma.codexolimpo.com.br>` | Remetente                                                           |
| `APP_URL`     | o `CORS_ORIGIN`                                       | Endereço das telas, para montar o link                              |

Com o Resend (subdomínio `logfarma.codexolimpo.com.br` já verificado em 06/11/2026): `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASS=<chave da API>`. Se a VPS bloquear a 465, use a 2465 (`SMTP_SECURE=true`) ou a 587/2587 (`SMTP_SECURE=false`).

## Escolhas feitas

| Escolha                                   | Alternativas consideradas            | Motivo                                                                                       |
| ----------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| SMTP genérico com `nodemailer`            | SDK do Resend                        | Pedido do Paulo: não prender o projeto a um provedor; trocar de provedor é só mudar o `.env` |
| Resposta igual com ou sem conta           | Avisar "e-mail não cadastrado"       | Não revela quem tem cadastro (RNF03)                                                         |
| Guardar só o hash do código               | Guardar o código                     | Quem ler o banco não consegue usar os links                                                  |
| 30 minutos, uso único, invalida os outros | Link sem prazo                       | Link de e-mail pode vazar (encaminhado, caixa compartilhada)                                 |
| Falha no envio vira só log técnico        | Responder erro                       | Erro só aconteceria quando a conta existe, o que revelaria o cadastro                        |
| Código no endereço (`?codigo=`)           | Código digitado à mão                | Um toque no e-mail; mais simples para o público idoso                                        |
| Vale para paciente e equipe               | Equipe continua falando com o gestor | Mesmo problema para todo mundo; o gestor não precisa virar suporte                           |

## Limites conhecidos

- **Sessões abertas continuam valendo** depois da troca de senha (a sessão é um JWT sem estado). Se for preciso derrubar sessões, vai exigir uma versão de sessão por usuário.
- **Sem limite de pedidos por minuto** na rota de recuperação. Antes de divulgar, vale pôr um rate limit (ex.: `@fastify/rate-limit`, biblioteca nova, precisa de aprovação).

## Como testar

```bash
pnpm --filter @fatec-pi/backend test    # test/password-reset.test.ts
pnpm --filter @fatec-pi/frontend test   # RecuperarConta.test.tsx
```

Na mão, sem SMTP: `pnpm dev`, abra `/recuperar-conta`, digite `maria@demo.logfarma` e copie o link do log do backend.
Com SMTP: preencha as variáveis `SMTP_*` no `.env`, crie uma conta com o seu e-mail em `/cadastro` e peça a recuperação.

## Histórico de alterações

| Data       | O que mudou    |
| ---------- | -------------- |
| 2026-11-06 | Versão inicial |
