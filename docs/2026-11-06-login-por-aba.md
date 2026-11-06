# Login pela aba certa (paciente ou equipe)

- **Implementado em:** 2026-11-06
- **Última alteração:** —
- **Requisitos:** RNF03

## Em poucas palavras

A tela Entrar tem duas portas: "Sou paciente" e "Sou da equipe". Antes, qualquer chave abria qualquer porta: a farmacêutica que entrava pela porta do paciente caía na área dela do mesmo jeito. Agora cada porta só aceita a sua chave. Quem erra a porta recebe um aviso dizendo qual é a certa, e a sessão não é aberta.

## O que

- `POST /api/auth/login` aceita um campo opcional `audience`: `"patient"` ou `"team"`.
- Se `audience` vem e não bate com o perfil da conta (`patient` × qualquer perfil da equipe), a API responde **403** e não abre a sessão. As mensagens são:
    - conta da equipe na aba do paciente: _Esta conta é da equipe. Toque em "Sou da equipe" para entrar._
    - paciente na aba da equipe: _Esta conta é de paciente. Toque em "Sou paciente" para entrar._
- A conferência acontece **depois** da senha. Com senha errada, a resposta continua sendo 401 "E-mail ou senha incorretos.", então a mensagem nunca revela de quem é um e-mail.
- A tela Entrar sempre manda `audience` de acordo com a aba marcada e mostra a mensagem da API no lugar do erro.

## Por que

Pedido do Paulo: um acesso de farmacêutico não pode entrar pela aba do paciente, e vice-versa. As abas mudam os textos e a ajuda (paciente pode criar conta, equipe não), então entrar pela aba errada confunde, e a pessoa nem percebe que está no lugar errado.

## Onde

- `apps/backend/src/routes/auth.ts` — campo `audience` no schema e a checagem
- `apps/backend/src/contracts.ts` e `apps/frontend/src/api/types.ts` — `LoginAudience` e `LoginInput`
- `apps/frontend/src/api/auth.ts` — `login(email, password, audience)`
- `apps/frontend/src/pages/entrar/Entrar.tsx` — envia a aba marcada
- `apps/backend/test/auth.test.ts`, `apps/frontend/src/pages/entrar/Entrar.test.tsx` — testes
- `apps/frontend/e2e/helpers.ts` — o `loginAs` das cenas abre a aba da equipe para as contas de demonstração que não são a Maria

## Escolhas feitas

| Escolha                                 | Alternativas consideradas                                    | Motivo                                                                               |
| --------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Checagem no backend                     | Só no frontend (entrar e sair na hora se o perfil não bater) | Não chega a abrir sessão nem a gravar cookie; a regra fica num lugar só              |
| `audience` opcional                     | Obrigatório                                                  | Não quebra quem já chama a rota sem ele (testes, scripts); a tela sempre manda       |
| 403 com mensagem que aponta a aba certa | 401 "E-mail ou senha incorretos."                            | A pessoa acertou a senha; dizer só "incorretos" a faria tentar de novo sem entender  |
| Checar depois da senha                  | Checar antes                                                 | Antes da senha, a mensagem revelaria se um e-mail é de paciente ou da equipe (RNF03) |

## Como testar

```bash
pnpm --filter @fatec-pi/backend test     # "login pela aba certa" em test/auth.test.ts
pnpm --filter @fatec-pi/frontend test    # Entrar.test.tsx
```

Na mão: `pnpm dev`, abra `/entrar` na aba "Sou paciente" e entre com `farmaceutico.centro@demo.logfarma`. Deve aparecer o aviso para usar "Sou da equipe". Troque de aba e entre.

## Histórico de alterações

| Data       | O que mudou    |
| ---------- | -------------- |
| 2026-11-06 | Versão inicial |
