# Primeiro gestor pelo `.env`

- **Implementado em:** 2026-11-06
- **Última alteração:** —
- **Requisitos:** RNF02, RNF03

## Em poucas palavras

Num prédio novo, alguém precisa receber a primeira chave para depois distribuir as outras. Antes, essa chave só existia na "maquete" (o seed da demonstração, que apaga o banco). Agora o `.env` traz um bilhete: "se ainda não tem síndico, crie este". O backend lê o bilhete ao ligar, cria o gestor uma vez só e, daí em diante, ignora o bilhete. A senha passa a morar no banco, com hash, como a de todo mundo.

## O que

- Ao iniciar, depois das migrações, o backend chama `ensureFirstManager`:
    - **já existe algum gestor** → não faz nada (e avisa no log se `ADMIN_EMAIL` estiver preenchido, para você apagar);
    - **não há gestor e `ADMIN_EMAIL` + `ADMIN_PASSWORD` estão definidas** → cria o gestor (`role: manager`);
    - **faltam as variáveis** → não faz nada.
- Em produção, recusa senha com menos de 12 caracteres ou conhecida (`admin1234`, `demo1234`…): não cria a conta e escreve o motivo no log.
- Erro nessa etapa vai para o log e **não derruba a API** (RNF02).
- O e-mail do gestor nunca vai para o log.

## Por que

Sem isso, um banco de produção novo não tinha como ganhar o primeiro gestor sem o seed de demonstração, que apaga tudo. E sem gestor ninguém cria as contas da equipe (`POST /api/manager/users`).

## Onde

- `apps/backend/src/services/bootstrap-admin.ts` — `ensureFirstManager` e `adminPasswordProblem`
- `apps/backend/src/server.ts` — chamada ao iniciar
- `apps/backend/src/env.ts` — `env.admin`
- `.env.example`, `infra/.env.prod.example`, `infra/compose.yaml`, `infra/compose.prod.yaml`, `infra/README.md`, `apps/backend/README.md`
- `apps/backend/test/bootstrap-admin.test.ts` — 6 testes

## Variáveis

| Variável         | Padrão          | Para quê                                                                              |
| ---------------- | --------------- | ------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`    | —               | E-mail do primeiro gestor (use um que você lê: é por ele que vem o "Recuperar conta") |
| `ADMIN_PASSWORD` | —               | Senha inicial (12+ caracteres em produção)                                            |
| `ADMIN_NAME`     | `Administrador` | Nome que aparece nas telas                                                            |

## Escolhas feitas

| Escolha                                 | Alternativas consideradas            | Motivo                                                                                                                                                          |
| --------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A env só cria a conta, uma vez          | Conferir o login direto contra a env | Trocar a senha não exige redeploy, a senha não fica em texto puro para sempre, o login é igual aos outros                                                       |
| Cria só se não houver **nenhum** gestor | Criar se o e-mail não existir        | Nunca mexe numa rede já em uso, mesmo se alguém esquecer as variáveis no `.env`                                                                                 |
| Senha fraca em produção: recusa e loga  | Derrubar o backend                   | Configuração errada não pode tirar o atendimento do ar (RNF02)                                                                                                  |
| Perfil `manager`                        | Novo perfil `platform_admin`         | O tenant está pausado; sem ele, o admin da plataforma faria o mesmo que o gestor. Quando o tenant voltar, este mesmo mecanismo passa a criar o `platform_admin` |

## Como testar

```bash
pnpm --filter @fatec-pi/backend test   # test/bootstrap-admin.test.ts
```

Na mão, num banco sem gestor (o seed de demo já cria um, então use um banco vazio): defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`, rode `pnpm dev:backend`, veja "primeiro gestor criado" no log e entre pela aba "Sou da equipe".

## Pendências

- CPF do gestor: entra junto com o login da equipe por CPF.

## Histórico de alterações

| Data       | O que mudou    |
| ---------- | -------------- |
| 2026-11-06 | Versão inicial |
