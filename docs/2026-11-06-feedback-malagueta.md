# Feedback da Malagueta sobre as telas

- **Implementado em:** 2026-11-06 (registro do feedback e das decisões; as mudanças nas telas ainda não foram feitas)
- **Última alteração:** 2026-11-06
- **Requisitos:** RF01, RF03, RF05, RF06, RF08, RNF03

## Em poucas palavras

É como entregar a casa para alguém que vai morar nela dar a volta antes da mudança: ela gostou da planta e do tamanho dos cômodos (letra grande, site simples), mas apontou o que incomoda no dia a dia: a placa da porta diz pouco, a chave reserva só existe no posto de saúde (recuperar senha), falta um mapa para quem não sabe o CEP e tem aviso falando demais. Aqui fica a lista organizada, com o que o grupo decidiu para cada ponto.

## O que

Lista do feedback que a Malagueta (Lorena) mandou em 04/11/2026 por áudio e em anotações no caderno, agrupado por tela, com as decisões de 06/11/2026 para os pontos que estavam em aberto. Cada item tem uma situação: **a fazer** ou **decidido**.

### 1. Página inicial (topo e apresentação)

| Item                                                                                                                     | Situação   |
| ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Manter a logo à esquerda                                                                                                 | já é assim |
| Trocar "Remédios do SUS em Taquaritinga, Matão e Monte Alto" pelo slogan **"A plataforma que te conecta com sua saúde"** | a fazer    |
| Chamada grande no centro: **"Acesse e saiba mais"**                                                                      | a fazer    |
| Texto pequeno abaixo com o que a plataforma faz (lista abaixo)                                                           | a fazer    |

Texto proposto por ela:

> **Aqui você:**
>
> - verifica a unidade SUS ou rede credenciada mais próxima do seu endereço
> - checa a disponibilidade do seu medicamento
> - solicita a entrega na sua residência
> - acompanha tudo pelo celular
>
> Plataforma simples e de fácil acesso.

### 2. Conta e login

| Item                                                                                                                                 | Situação                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Manter "Ainda não tem conta? **Criar conta**"                                                                                        | já é assim                                                 |
| "Esqueceu a senha? **Recuperar conta**" direto pelo app, em vez de mandar a pessoa ao balcão da unidade                              | decidido (ver decisão 1)                                   |
| Conta de paciente só entra pela aba "Sou paciente" e conta da equipe só pela aba "Sou da equipe" (pedido do Paulo, não da Malagueta) | feito: [Login pela aba certa](2026-11-06-login-por-aba.md) |

### 3. Cadastro

| Item                                                                                                                    | Situação                                  |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| No campo CEP: "Não sabe seu CEP?" com link para o **Busca CEP** dos Correios (`https://buscacepinter.correios.com.br/`) | feito (cadastro e Meus dados)             |
| Seção **"Locomoção e prioridade"** com a caixa "☐ Tenho dificuldade para locomoção"                                     | a fazer (o campo já existe, muda o texto) |
| Pergunta **"Possui alguma condição listada abaixo?"** antes da lista de prioridades                                     | feito em Meus dados (falta no cadastro)   |

### 4. Textos

| Item                                                                                                    | Situação                                                             |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Enxugar os textos: "o site fala muito para coisinhas pequenas", sobretudo depois do cadastro e da conta | a fazer                                                              |
| Trocar **"Procurar remédio"** por **"Buscar medicamento"** (título, menu, botão de Meus pedidos)        | a fazer                                                              |
| Bloco **"Bom saber…"** com "Para retirada, leve a receita e documento com foto."                        | feito no Início (o telefone da unidade está no cartão "Sua unidade") |
| "Ligue para consultar disponibilidade"                                                                  | decidido (ver decisão 3)                                             |
| Aviso de **"Indisponível?"** com lista de espera e notificação                                          | decidido (ver decisão 2)                                             |

### 5. Visual

- **Fonte:** aprovada (grande e legível).
- **Simplicidade:** aprovada; o site se explica sozinho, que é o objetivo, já que todo mundo tem de conseguir usar.
- **Cor:** ela achou "bem azul", mas bonito. Não muda por enquanto.
- **Para depois:** detalhes de acabamento no frontend (ela citou corações). Fica para a fase de acabamento.

## Decisões tomadas (2026-11-06)

1. **Recuperar senha pelo app, com e-mail por SMTP.** Decisão do Paulo. Começou com o Resend; depois ficou SMTP genérico, para não prender o projeto a um provedor (o Resend continua sendo o provedor usado, pelo SMTP dele). **Feito:** [Recuperar senha pelo app](2026-11-06-recuperar-senha.md).
2. **Lista de espera: o paciente escolhe entrar, com um toque.** O texto da Malagueta dizia "você será inserido na lista de espera". A decisão é manter a escolha com o paciente: o botão "Pedir assim mesmo" (tela Onde tem) é o que coloca o pedido na lista. Motivos: entrar na lista exige um pedido (endereço, receita, retirada ou entrega), a lista é por unidade e quem entra recebe avisos, o que só deve acontecer com o consentimento da pessoa. O aviso fica assim, no tom que ela propôs:
    > **Indisponível na sua unidade?** Não se preocupe: toque em "Pedir assim mesmo" e você entra na lista de espera. Ative as notificações do aplicativo; você receberá um aviso assim que o medicamento estiver disponível.
3. **Sem "Ligue para consultar disponibilidade".** Ver se tem o remédio é justamente o que o app faz (RF01/RF02). Mandar ligar desmonta a proposta. Em vez disso, o bloco "Bom saber…" mostra o **telefone e o horário da unidade** (já cadastrados em `Pharmacy.phone` e `Pharmacy.openingHours`) para dúvidas sobre o pedido:
    > **Bom saber…**
    >
    > - Para retirar, leve a receita e um documento com foto.
    > - Dúvidas sobre o seu pedido? Ligue para a unidade: _(telefone)_, _(horário)_.
4. **Prioridade: mantém as três condições, com a pergunta dela e consentimento.** A pergunta é "Possui alguma condição listada abaixo?". As opções são as que o backend já aceita (`PatientPriority.category`): **Doença crônica**, **Câncer (tratamento oncológico)** e **Doença rara**, mais **"Não tenho / prefiro não dizer"**, que é o padrão. Escolher uma condição mostra a caixa de consentimento que já existe ("Autorizo usar essa informação só para me dar prioridade na lista de espera."). Nada de campo livre de diagnóstico (RNF03, LGPD: só o mínimo necessário).

## Por que

O público principal são idosos e pessoas com pouca familiaridade com apps. Cada passo a mais (ir ao posto para recuperar a senha, procurar o CEP, ler um aviso comprido) é um motivo para desistir. O feedback de alguém de fora do código mostra onde a tela ainda fala "tecnicamente" ou depende do balcão.

## Onde

Nada foi alterado nas telas ainda. Quando for implementar:

- `apps/frontend/src/pages/entrar/Entrar.tsx` — slogan, chamada, "Aqui você", Recuperar conta
- `apps/frontend/src/pages/paciente/CriarConta.tsx` e `MeusDados.tsx` — Busca CEP, "Locomoção e prioridade"
- `apps/frontend/src/pages/paciente/Procurar.tsx`, `app/layouts/PatientLayout.tsx`, `MeusPedidos.tsx` — "Buscar medicamento"
- `apps/frontend/src/pages/paciente/OndeTem.tsx` — aviso de indisponível
- `apps/backend/src/routes/auth.ts` + novo serviço de e-mail — recuperação de senha

## Escolhas feitas

| Escolha                                                | Alternativas consideradas                     | Motivo                                                                     |
| ------------------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------- |
| E-mail por SMTP (provedor: Resend)                     | SMTP próprio, SendGrid, recuperação no balcão | Decisão do Paulo; API simples e plano gratuito suficiente para o PI        |
| Lista de espera por escolha do paciente                | Inscrição automática quando falta na rede     | Precisa de pedido e de consentimento para avisos; já é um toque só         |
| Telefone da unidade no lugar de "ligue para consultar" | Manter o texto dela                           | O app existe para evitar a ligação; o telefone fica para dúvidas do pedido |
| Três condições + "prefiro não dizer"                   | Lista maior de doenças, campo livre           | É o que a regra de prioridade usa; LGPD pede o mínimo                      |
| Cor azul mantida                                       | Trocar a paleta agora                         | Ela aprovou; acabamento visual fica para depois                            |

## Como testar

Ainda não há o que testar nas telas. Cada item "a fazer", quando implementado, entra com teste da tela (`pnpm --filter @fatec-pi/frontend test`) e atualiza este documento.

## Histórico de alterações

| Data       | O que mudou                                                                                                                                                                               |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-06 | Versão inicial: feedback agrupado e decisões 1–4                                                                                                                                          |
| 2026-11-06 | Recuperar senha implementada por SMTP genérico (sem prender ao Resend)                                                                                                                    |
| 2026-11-06 | Feitos: link do Busca CEP, pergunta de prioridade com "Não tenho / prefiro não dizer" (Meus dados), "Bom saber" no Início sem "ligue antes" e telefone da unidade no cartão "Sua unidade" |
