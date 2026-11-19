# Dados da apresentação em produção (sem apagar nada)

- **Implementado em:** 2026-11-19
- **Última alteração:** 2026-11-19
- **Requisitos:** RF01–RF08 (cenários de demonstração)

## Em poucas palavras

O banco de produção era uma farmácia recém-inaugurada: prateleiras com etiquetas (o catálogo de remédios) mas vazias, e ninguém no balcão. Para a apresentação, enchemos as prateleiras, contratamos uma pessoa para cada função (farmacêutico, entregador, fornecedor, gestor) e deixamos alguns atendimentos "no meio do caminho" — um remédio separado, um a caminho de outra unidade, uma entrega marcada, uma fila de espera — para mostrar cada tela funcionando. Nada do que já estava lá foi jogado fora.

## O que

Novo script `seed-presentation`, que **só acrescenta**:

- **Estoque** em todas as 18 unidades: ~2.000 itens e ~2.450 lotes, cada um com movimento de entrada. UBS trabalham o componente básico; farmácia municipal, básico + estratégico; farmácia de especializados, alto custo; Farmácia Popular, os do programa. O sorteio é fixo (mesmo resultado em qualquer banco) e deixa ~8% em falta, ~12% abaixo do mínimo e alguns lotes perto de vencer.
- **Contas `@demo.logfarma`** (uma por perfil): pacientes `maria`, `jose`, `rafael`; `farmaceutico.centro`, `auxiliar.centro`, `farmaceutico.jardim`, `farmaceutico.especializados`; `fornecedor`, `fornecedor2`; `entregador1`, `entregador2`; `gestor`. Senha definida na hora (variável `PRESENTATION_PASSWORD`), passada ao grupo por fora — **não vai para o git**.
- **Cenários**, criados pelas mesmas funções de serviço que as telas usam:

| Cenário                              | Situação                                                  | Quem age na apresentação                                                      |
| ------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Paracetamol do Rafael                | entregue (histórico)                                      | —                                                                             |
| Amoxicilina do José                  | retirada no balcão (histórico)                            | —                                                                             |
| Metformina da Maria, UBS Centro      | pronta para retirada                                      | farmacêutico/auxiliar do Centro: dispensar                                    |
| Losartana da Maria (falta no Centro) | transferência pedida à UBS Jardim                         | farmacêutico do Jardim: enviar; Centro: receber e agendar entrega             |
| Dipirona do Rafael                   | entrega agendada para o entregador 1                      | entregador 1: aceitar, retirar, entregar                                      |
| Adalimumabe (falta em toda a rede)   | Rafael e José na lista de espera; pedido de compra aberto | fornecedor: confirmar prazo. Maria pode pedir ao vivo e entra em 2º (crônica) |
| Losartana no Centro                  | reposição automática confirmada pelo fornecedor 2         | —                                                                             |

- **215 buscas anônimas** nos últimos 30 dias para o painel do gestor (adalimumabe aparece como demanda não atendida).

## Por que

A apresentação usa o banco da VPS. O `seed.ts` da demonstração apaga tudo antes de carregar e não pode rodar em produção (lá já há contas reais do grupo). Faltava um jeito de ter dados de demonstração sem perder nada.

## Onde

| Arquivo                                    | O que mudou                           |
| ------------------------------------------ | ------------------------------------- |
| `apps/backend/src/db/seed-presentation.ts` | Script novo                           |
| `apps/backend/package.json`                | Script `db:presentation`              |
| Banco `logfarma` na VPS                    | Dados acima, carregados em 2026-11-19 |

## Escolhas feitas

| Escolha                                                                                        | Alternativas consideradas               | Motivo                                                                                                         |
| ---------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Script novo, só de acréscimo                                                                   | Rodar o `seed.ts` com `ALLOW_DEMO_SEED` | O `seed.ts` apaga o banco inteiro, inclusive as contas reais                                                   |
| Cenários pelas funções de serviço (`createRequest`, `runCounterAction`, `runCourierAction`...) | Inserir direto nas tabelas              | Reservas, notificações, filas e status ficam exatamente como se as telas tivessem sido usadas                  |
| Recusa rodar se já existir conta `@demo.logfarma`                                              | Tentar "completar" o que falta          | Simples e sem risco de duplicar estoque                                                                        |
| Rodado copiando o `.js` compilado para o container e apagando depois                           | Publicar uma imagem nova antes          | Não depende de deploy; antes conferimos que os 55 arquivos compilados da imagem eram idênticos ao código local |
| Senha por variável de ambiente, sem padrão                                                     | Senha fixa no código                    | O repositório é visto por outras pessoas; contas de gestor e farmácia em produção não podem ter senha pública  |

## Como rodar de novo

Num banco sem as contas `@demo.logfarma` e com o catálogo carregado:

```bash
PRESENTATION_PASSWORD=... pnpm --filter @fatec-pi/backend db:presentation   # dev
```

Na VPS, depois de uma imagem que já contenha o script: `docker compose exec -e PRESENTATION_PASSWORD=... backend node dist/db/seed-presentation.js`.

**Depois da apresentação:** vale desativar as contas `@demo.logfarma` (pelo painel do gestor) ou trocar a senha delas.

## Histórico de alterações

| Data       | Alteração                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------- |
| 2026-11-19 | Criação e carga no banco de produção                                                                     |
| 2026-11-19 | Senha das contas `@demo.logfarma` trocada na produção (a pedido do grupo, para facilitar a apresentação) |
