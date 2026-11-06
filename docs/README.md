# docs — diário de bordo do projeto

Aqui fica registrado **tudo que foi feito** no monorepo: o que mudou, por que, onde e quais escolhas foram feitas no caminho. É a memória do grupo — quem chega depois lê aqui em vez de adivinhar pelo código.

## Regras

- Um arquivo por entrega/assunto: `AAAA-MM-DD-assunto-curto.md` (a data é a da implementação).
- Toda entrada tem **data de implementação**. Se o assunto mudar depois, **não crie outro arquivo**: atualize este e acrescente uma linha no histórico de alterações com a data.
- Escreva para alguém do grupo que não acompanhou: comece com a versão lúdica, depois os detalhes.
- Vale para humanos e para agentes (Claude Code, Codex). Ver "Regras para agentes" no `CLAUDE.md` da raiz.

## Modelo

```markdown
# <Título>

- **Implementado em:** AAAA-MM-DD
- **Última alteração:** AAAA-MM-DD (ou "—")
- **Requisitos:** RF0X, RNF0X (se houver)

## Em poucas palavras

<Explicação lúdica, com uma analogia do dia a dia, em 3–5 linhas.>

## O que

<O que foi feito, de forma objetiva.>

## Por que

<Problema que resolve / motivo da mudança.>

## Onde

<Pastas e arquivos principais afetados.>

## Escolhas feitas

| Escolha | Alternativas consideradas | Motivo |
| ------- | ------------------------- | ------ |

## Como testar

<Comandos ou passos.>

## Histórico de alterações

| Data       | O que mudou    |
| ---------- | -------------- |
| AAAA-MM-DD | Versão inicial |
```

## Índice

| Data       | Documento                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------- |
| 2026-11-03 | [Migração para monorepo](2026-11-03-monorepo.md)                                               |
| 2026-11-03 | [Grafo de conhecimento com graphify](2026-11-03-graphify.md)                                   |
| 2026-11-03 | [Formatação automática com Prettier](2026-11-03-prettier.md)                                   |
| 2026-11-03 | [Design do backend — demonstração Dona Maria](2026-11-03-backend-design.md)                    |
| 2026-11-03 | [Backend implementado: API, banco e as três cenas](2026-11-03-backend.md)                      |
| 2026-11-04 | [Design das telas](2026-11-04-frontend-design.md)                                              |
| 2026-11-04 | [Telas implementadas](2026-11-04-frontend.md)                                                  |
| 2026-11-04 | [Logo do LogFarma](2026-11-04-logo.md)                                                         |
| 2026-11-04 | [Publicação na VPS, catálogo, logo e cadastro mais fácil](2026-11-04-publicacao-e-catalogo.md) |
| 2026-11-04 | [Um `.env` só para o desenvolvimento](2026-11-04-env-unico.md)                                 |
| 2026-11-04 | [`main` protegida](2026-11-04-main-protegida.md)                                               |
| 2026-11-06 | [Feedback da Malagueta sobre as telas](2026-11-06-feedback-malagueta.md)                       |
| 2026-11-06 | [Login pela aba certa (paciente ou equipe)](2026-11-06-login-por-aba.md)                       |
| 2026-11-06 | [Recuperar senha pelo app](2026-11-06-recuperar-senha.md)                                      |
| 2026-11-06 | [Primeiro gestor pelo `.env`](2026-11-06-primeiro-gestor.md)                                   |
