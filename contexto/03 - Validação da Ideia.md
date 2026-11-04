# Validação da Ideia

Documentos relacionados: [[01 - Visão do Projeto]] · [[02 - Proposta de Valor]]

> Pesquisa feita em out/2026 a partir do documento do Projeto Integrador e dos slides do grupo. Cada afirmação do trabalho foi comparada com fontes públicas, e o mercado e as regras do setor foram mapeados.

---

## Veredito

| Dimensão | Resultado | Comentário |
|---|---|---|
| **O problema existe?** | ✅ Validado | Dados fortes e recentes (CNM, Medicamento no Tempo Certo, CFF). |
| **A dor é relevante?** | ✅ Validado | Impacto clínico comprovado (interrupção de tratamento). |
| **Há demanda pela solução?** | ✅ Validado | O poder público já criou apps do tipo (SP), ou seja, existe demanda institucional. |
| **A solução é inédita?** | ⚠️ Parcial | Busca de estoque já existe em SP. O inédito é o **ciclo completo** (espera com prioridade + transferência + entrega). |
| **É viável como está escrita?** | ⚠️ Com ajustes | Transferência e entrega **não são permitidas no Farmácia Popular** hoje. São viáveis na **rede municipal do SUS**. |

**Conclusão:** a ideia é **válida e boa**, mas precisa de um **ajuste de escopo**: o núcleo deve ser a **rede pública municipal (UBS e farmácias do SUS)**. O Farmácia Popular entra como camada de **consulta** ("onde encontrar"), e não como rede de transferência e entrega.

---

## 1. Checagem das afirmações do trabalho

| Afirmação no documento | Status | O que a pesquisa mostrou |
|---|---|---|
| CNM: 3.360 municípios, falta de remédios em 82% | ✅ Confirmado | Correto. **Atenção:** o levantamento é de **2022**. Citar o ano para não parecer dado de 2026. |
| MTC: 33.104 relatos no 1º tri de 2026 | ✅ Confirmado | Correto, 58 medicamentos. **Atenção:** os relatos são sobretudo de **alto custo / Componente Especializado (CEAF)**, como leflunomida, adalimumabe e insulina análoga, e não de Farmácia Popular. |
| MTC: 8.432 relatos em dez/2025 | ❓ Não verificado | Não encontrei a fonte primária. Conferir o link ou remover. |
| Revisão sistemática da SBC sobre adesão cardiovascular | ✅ Plausível | O artigo existe no PMC (PMC11634203) e é citado corretamente. |
| AquiTemRemédio com nota 1,4 e 233 avaliações | ✅ Confirmado (atualizar) | Hoje: **1,3 com 238 avaliações**, última atualização em **nov/2022**. Usuários relatam travamentos e busca que não funciona. |
| "Projeto inovador: integração em tempo real" | ⚠️ Rever | A Prefeitura de SP lançou em **jun/2026** o **Remédio na Hora** (no app e-saúdeSP), que mostra a farmácia mais próxima com o item em estoque. O trabalho não cita isso. |

## 2. Mapa de concorrentes e soluções parecidas

| Solução | Quem | Faz o quê | O que falta |
|---|---|---|---|
| **Remédio na Hora / e-saúdeSP** | Prefeitura de SP (2026) | Consulta estoque na rede municipal e indica a unidade mais próxima | Só SP. Sem lista de espera, alerta, transferência ou entrega |
| **Aqui Tem Remédio** | Prefeitura de SP (2015) | Busca de estoque por endereço | Abandonado (2022), nota 1,3 |
| **MedSUS** | Ministério da Saúde | Catálogo nacional do que o SUS oferece e **tipo** de local de retirada | Não mostra estoque por unidade |
| **Meu SUS Digital / Painel PFPB** | Ministério da Saúde | Mapa das farmácias credenciadas ao Farmácia Popular | Não mostra estoque |
| **Meu Remédio Prefeituras** | Privado, para prefeituras | Unidades de saúde que dispensam remédios gratuitos | Cobertura limitada |
| **Remédio em Casa** | SP, PR, MT, RO e outros | Entrega domiciliar para crônicos estáveis | Não tem busca de estoque nem integração com fila |
| **Consulta Remédios, apps de farmácia** | Privado | Preço e compra | Foco em venda, fora do SUS |

**Leitura:** o mercado tem **peças soltas**. Ninguém faz o ciclo completo para a rede pública com prioridade clínica. **O diferencial do projeto deve ser apresentado assim**, e não como "consulta em tempo real", que já existe.

## 3. Riscos encontrados

### 🔴 Risco 1: o Farmácia Popular não permite transferência nem entrega em casa

- As farmácias do PFPB são **empresas privadas**. O estoque é delas, e não do governo. Elas **não são obrigadas** a informar estoque a terceiros.
- As regras do programa **proíbem entregar medicamentos do PFPB fora do estabelecimento**, especialmente em domicílio. A retirada é presencial, pelo paciente, por representante legal ou por cuidador com procuração.
- Uma farmácia não pode, em regra, vender ou transferir medicamento para outra farmácia de **CNPJ diferente**. Isso é atividade de **distribuidora**, que exige autorização própria da Anvisa.
- O **PL do Farmácia Popular Digital** (entrega em casa para idosos e PcD) foi aprovado em comissão em 2026, mas **ainda não é lei**.

➡️ **Consequência:** RF07 (transferência) e RF08 (entrega) **não funcionam no PFPB hoje**. Funcionam na **rede municipal do SUS**, onde todas as unidades pertencem ao mesmo dono (a prefeitura) e o remanejamento interno já é rotina.

### 🟠 Risco 2: as evidências não batem com o escopo

- As maiores estatísticas (33 mil relatos) tratam de **medicamentos de alto custo (CEAF)**, dispensados em **farmácias estaduais**. Esses medicamentos ficam em falta **no país inteiro ao mesmo tempo**, porque a falha está na compra federal. Nesse caso, **localizar não resolve**. O que ajuda é **fila, alerta e transparência de prazo**.
- O dado da CNM (antibióticos, anti-hipertensivos, diabetes) trata da **atenção básica municipal**, onde a falta é **desigual entre unidades**. **É aqui que localizar e remanejar resolvem de verdade.**
- O documento cita como stakeholder os **"departamentos farmacêuticos de hospitais do SUS"**, mas farmácia hospitalar atende principalmente **pacientes internados**. Quem dispensa ao paciente na rua é a **UBS / farmácia municipal** (e a farmácia estadual, no alto custo).

➡️ **Consequência:** reposicionar o público e os stakeholders. Usar o dado da CNM como argumento principal para a busca e a transferência, e o dado do MTC como argumento para a fila com prioridade.

### 🟠 Risco 3: de onde vem o dado de estoque "em tempo real"?

- **Rede SUS:** a **BNAFAR** consolida posição de estoque dos municípios (via Hórus ou webservice). É um bom ponto de partida, mas é enviada **periodicamente**, não a cada dispensação. Para "tempo real" é preciso integrar com o sistema de gestão de estoque do município (Hórus, e-SUS ou sistema próprio).
- **Farmácia Popular:** não existe base pública de estoque. As alternativas são parceria com as redes de farmácia (integração com o ERP) ou informação colaborativa (o paciente ou o balconista informa "tem / não tem").

➡️ **Consequência:** mudar o requisito de "tempo real" para "**atualizado com frequência conhecida**" e mostrar ao paciente **quando o dado foi atualizado** ("estoque atualizado há 2 h").

### 🟡 Risco 4: a causa-raiz continua

O próprio trabalho reconhece isso no escopo negativo. Na apresentação, deixar claro: **o sistema reduz o tempo e o sofrimento da busca e dá dado para o gestor planejar, mas não cria remédio que não foi comprado.**

### 🟡 Risco 5: LGPD e dados de saúde

Receita, CID e condição crônica são **dados pessoais sensíveis** (LGPD, art. 11). A fila com prioridade clínica exige base legal (tutela da saúde ou políticas públicas), consentimento claro, mínimo de dados e controle de acesso. Isso deve entrar no RNF03 com mais detalhe.

## 4. Ajustes recomendados

1. **Núcleo do MVP = rede pública municipal** (UBS + farmácia municipal). Piloto sugerido: **Taquaritinga/SP**, com conversa com a Secretaria Municipal de Saúde.
2. **Farmácia Popular = módulo de consulta**: mapa das credenciadas (dado público) + estoque informado de forma colaborativa ou por farmácias parceiras. Sem transferência e sem entrega até a lei mudar.
3. **Entrega domiciliar = integrar** com o programa municipal Remédio em Casa (ou similar), em vez de contratar motoboy ou Correios diretamente.
4. **Alto custo (CEAF) = módulo de fila e transparência**: lista de espera com prioridade, aviso de chegada e prazo informado pela farmácia estadual.
5. **Reescrever o "é inovador?"**: em vez de "consulta em tempo real", usar **"o único fluxo que leva o paciente da busca até a entrega, com prioridade clínica"**.
6. **Corrigir as referências**: datar o estudo da CNM (2022), atualizar a nota do AquiTemRemédio, citar o Remédio na Hora e conferir a fonte do dado de dez/2025.
7. **Novo valor para o gestor**: um painel de **demanda não atendida** (buscas sem estoque por medicamento e região) para orientar as compras. É um dado que ninguém tem hoje e que ataca, indiretamente, a causa-raiz.

## 5. Como validar com pessoas (próxima etapa)

A validação até aqui foi **documental**. Para fechar, o grupo pode fazer:

| Ação | Com quem | Pergunta-chave | Meta |
|---|---|---|---|
| Entrevistas curtas (10 min) | 10–15 pacientes na fila de UBS ou farmácia | "Nos últimos 3 meses você voltou para casa sem o remédio? Quantas unidades visitou?" | ≥ 50% com resposta "sim" |
| Entrevista | 2–3 farmacêuticos da rede municipal | "Como vocês sabem se outra unidade tem o item? Como pedem remanejamento?" | Confirmar que o processo é manual (telefone/WhatsApp) |
| Conversa | Secretaria Municipal de Saúde | "Qual sistema de estoque vocês usam? Enviam para a BNAFAR?" | Confirmar a fonte de dados para a POC |
| Teste de protótipo | 5 pacientes (incluindo idosos) | Encontrar um remédio no protótipo sem ajuda | ≥ 4 de 5 concluem a tarefa |

---

## Fontes

- CNM: [Desabastecimento de remédios afeta mais de 3,3 mil municípios](https://cnm.org.br/comunicacao/noticias/desabastecimento-de-remedios-afeta-mais-de-3-3-mil-municipios-indica-estudo-da-cnm) · [Brasil 61](https://brasil61.com/n/municipios-enfrentam-dificuldades-com-o-desabastecimento-de-remedios-em-farmacias-bras238240)
- Gazeta do Povo: [33 mil pacientes afetados por falta de medicamentos no SUS](https://www.gazetadopovo.com.br/brasil/pacientes-cronicos-racionam-param-tratamento-por-falta-medicamentos-sus/)
- Biored Brasil: [Falta de medicamentos nas farmácias de alto custo no início de 2026](https://www.bioredbrasil.com.br/falta-de-medicamentos-nas-farmacias-de-alto-custo-expoe-crise-no-acesso-a-tratamentos-no-sus-no-inicio-de-2026/)
- CFF: [Falta de medicamentos preocupa pacientes com doenças crônicas e raras](https://site.cff.org.br/noticia/Noticias-gerais/10/06/2026/falta-de-medicamentos-preocupa-pacientes-com-doencas-cronicas-e-raras-no-sus)
- App Store: [Aqui tem remédio](https://apps.apple.com/br/app/aqui-tem-remedio/id1065835148)
- Prefeitura de SP: [e-saúdeSP permite consultar disponibilidade de medicamentos](https://prefeitura.sp.gov.br/web/prefeitura-de-sao-paulo/w/aplicativo-e-sa%C3%BAdesp-permite-consultar-disponibilidade-de-medicamentos-na-rede-municipal) · [Remédio em Casa](https://prefeitura.sp.gov.br/web/saude/w/programas/5875)
- Ministério da Saúde: [MedSUS](https://www.gov.br/saude/pt-br/assuntos/noticias/2024/janeiro/aplicativo-medsus-e-disponibilizado-para-populacao) · [BNAFAR](https://www.gov.br/saude/pt-br/composicao/sectics/daf/bnafar) · [Painel de endereços PFPB](https://infoms.saude.gov.br/extensions/SEIDIGI_DEMAS_PFPB_ENDERECOS/index.html)
- Regras do Farmácia Popular: [Retirada por terceiros](https://m2farma.com/blog/retirada-por-terceiros-no-farmacia-popular/) · [Resumo das normas](https://m2farma.com/blog/resumo-normas-regras-farmacia-popular/)
- Câmara dos Deputados: [Comissão aprova Farmácia Popular Digital com entrega em casa](https://www.camara.leg.br/noticias/1241433-comissao-aprova-criacao-do-farmacia-popular-digital-com-entrega-em-casa-para-idosos/)
- Anvisa/STJ: [Filial de farmácia e atividade de distribuidora](https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/Filial-de-farmacia-pode-ter-autorizacao-da-Anvisa-para-distribuir-medicamentos.aspx)
- Paraná: [Remédio em Casa beneficia mais de 32 mil](https://www.parana.pr.gov.br/aen/Noticia/Programa-Remedio-em-Casa-amplia-alcance-e-ja-beneficia-mais-de-32-mil-paranaenses)
- SBC/PMC: [Risco de desfechos adversos com baixa adesão cardiovascular](https://pmc.ncbi.nlm.nih.gov/articles/PMC11634203/)
