# Proposta de Valor: por que o projeto é bom

Documentos relacionados: [[01 - Visão do Projeto]] · [[03 - Validação da Ideia]]

---

## 1. Resolve um problema real, grande e atual

Os números não vêm de suposição, vêm de fontes públicas:

- **82% dos municípios** pesquisados pela Confederação Nacional de Municípios (3.360 cidades, 60% do país) relataram falta de medicamentos. Os mais afetados são antibióticos (82,6%), anti-hipertensivos (42,2%), medicamentos do sistema nervoso (39,9%) e para diabetes (35,6%). Quase metade dos gestores disse que a falta dura **de 30 a 90 dias**.
- **33.104 relatos** de falta e irregularidade no SUS só no 1º trimestre de 2026, envolvendo 58 medicamentos (movimento Medicamento no Tempo Certo).
- Em pesquisa do mesmo movimento divulgada pelo Conselho Federal de Farmácia (jun/2026), **52% dos pacientes** disseram já ter ficado sem tratamento em algum momento.

Não é um problema de nicho: atinge cidades pequenas e grandes e afeta justamente quem depende do SUS.

## 2. O impacto é na saúde, não só na conveniência

Ficar sem o remédio leva a **racionar ou interromper o tratamento**. Uma revisão sistemática publicada pela Sociedade Brasileira de Cardiologia mostra que a baixa adesão a medicamentos cardiovasculares aumenta o risco de eventos cardiovasculares, AVC e morte. Cada dia a menos procurando o medicamento é um dia a menos sem tratamento.

## 3. Gera economia para o poder público

Hoje uma unidade em falta costuma resolver com **nova compra**, enquanto outra unidade da mesma rede tem estoque parado (às vezes perto do vencimento). Com visibilidade da rede inteira, dá para:

- **remanejar** antes de comprar;
- **reduzir perdas por validade** (o estoque parado passa a ser visto);
- **antecipar a reposição** com alerta de estoque mínimo;
- dar ao gestor um **painel da demanda não atendida** (quantas pessoas procuraram e não acharam), um dado que hoje quase não existe e que ajuda no planejamento de compras.

## 4. O diferencial: cobre o ciclo inteiro, não só a busca

As ferramentas que existem resolvem pedaços isolados do problema (detalhes na [[03 - Validação da Ideia]]):

| Necessidade do paciente | Ferramentas atuais | Este projeto |
|---|---|---|
| Saber **o que** o SUS oferece | MedSUS | ✔ |
| Saber **onde** fica a farmácia credenciada | Meu SUS Digital, painel PFPB | ✔ |
| Saber **se tem estoque agora** | Só em algumas capitais (ex.: SP) | ✔ |
| Ser **avisado quando chegar** | Não encontrado | ✔ |
| **Fila com prioridade clínica** | Não encontrado | ✔ |
| **Transferência** entre unidades a pedido do paciente | Processo interno, sem o paciente ver | ✔ |
| **Entrega em casa** | Programas isolados (Remédio em Casa) | ✔ integrado |

O valor está em **juntar** busca, espera, transferência e entrega numa só jornada, centrada no paciente que não pode ficar sem o remédio.

## 5. Prioriza quem mais sofre

A lista de espera dá prioridade a **pacientes crônicos, oncológicos e com doenças raras**, e a entrega domiciliar atende quem **não consegue se deslocar**, o grupo mais associado à interrupção do tratamento. O sistema não trata todos como iguais quando o risco clínico é diferente.

## 6. Há espaço para fazer melhor do que já foi feito

O aplicativo oficial **Aqui Tem Remédio** (Prefeitura de São Paulo) mostra que a demanda existe e que o próprio poder público já investiu nisso. Mas ele tem **nota 1,3 de 5** (238 avaliações) na App Store, não recebe atualização desde **novembro de 2022**, e os usuários relatam travamentos e buscas que não funcionam. A ideia já foi aceita pelo poder público; o que faltou foi uma boa execução.

## 7. É viável tecnicamente

- O SUS já tem uma base nacional de estoque: a **BNAFAR** (Base Nacional de Dados de Ações e Serviços da Assistência Farmacêutica) recebe posição de estoque, entradas e saídas dos municípios pelo sistema **Hórus** ou por *webservice*, e há documentação pública do webservice.
- Rotas e geolocalização usam serviços prontos (OpenStreetMap/OSRM, Google Maps).
- Notificações por push, SMS ou WhatsApp são tecnologia comum.
- Um MVP para **um município** (ex.: Taquaritinga) é de tamanho adequado para um projeto acadêmico e pode crescer depois.

## 8. Está alinhado a políticas públicas em andamento

- Programas **Remédio em Casa** já entregam medicamentos em SP, PR (32 mil usuários em 2025), MT e RO, o que mostra que a entrega domiciliar pelo SUS funciona e tem orçamento.
- Um projeto de lei que cria o **Farmácia Popular Digital**, com entrega em casa para idosos e pessoas com deficiência, foi aprovado em comissão da Câmara em 2026.

O projeto segue a direção em que as políticas públicas já estão indo.

---

**Resumo:** problema comprovado, impacto clínico mensurável, economia para o gestor, um diferencial claro (o ciclo completo com prioridade clínica), precedente de mercado mal executado e um caminho técnico viável.
