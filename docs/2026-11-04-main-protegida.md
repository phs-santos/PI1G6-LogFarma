# `main` protegida

- **Implementado em:** 2026-11-04
- **Última alteração:** —
- **Requisitos:** RNF02

## Em poucas palavras

A `main` virou a versão oficial do projeto, aquela que vai para o ar. Agora só uma pessoa tem a chave dessa porta: quem quiser mudar algo trabalha numa branch e abre um PR, e o dono do repositório decide o que entra. Ninguém consegue apagar a `main` nem reescrever o histórico dela, nem sem querer.

## O que

Ruleset **`main protegida`** no GitHub (Settings → Rules → Rulesets), ativo na branch padrão:

- **Restrict updates:** ninguém faz push nem merge direto na `main`.
- **Block force pushes:** o histórico não pode ser reescrito.
- **Restrict deletions:** a branch não pode ser apagada.
- **Exceção (bypass):** só o papel **Repository admin**, que hoje é só o `phs-santos`.

## Por que

O deploy de produção usa o código da `main`. Uma mudança que entra sem revisão pode derrubar o site na hora da apresentação.

## Onde

Só na configuração do repositório `phs-santos/PI1G6-LogFarma` no GitHub. Nenhum arquivo do código mudou.

## Escolhas feitas

| Escolha                                            | Alternativas consideradas               | Motivo                                                  |
| -------------------------------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Ruleset com exceção para o papel admin             | "Restrict who can push" para uma pessoa | Repositório pessoal não tem essa opção (só organização) |
| Bloquear também o merge de PR por quem não é admin | Exigir 1 aprovação no PR                | Pedido do grupo: só o dono sobe na `main`               |

## Como trabalhar agora

```bash
git switch -c minha-mudanca
git push -u origin minha-mudanca
gh pr create            # o dono revisa e faz o merge
```

## Histórico de alterações

| Data       | O que mudou    |
| ---------- | -------------- |
| 2026-11-04 | Versão inicial |
