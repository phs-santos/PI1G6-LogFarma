# Design das telas — LogFarma

- **Implementado em:** 2026-11-04 (registro em [2026-11-04-frontend.md](2026-11-04-frontend.md))
- **Última alteração:** —
- **Requisitos:** RF01–RF08, RNF03 · depende de [design do backend](2026-11-03-backend-design.md)

## Em poucas palavras

O LogFarma vai ter a cara de uma coisa que a Dona Maria já conhece: a **receita de papel**. Linhas azuis, tinta de caneta, a **tarja** da caixa do remédio dizendo se precisa de receita e **carimbos** de "Em falta" e "Tem". No celular dela, letra grande, poucos botões e uma resposta direta: "Tem na UBS Jardim, a 1,1 km. Vou buscar lá ou receber em casa?". Cada pessoa da equipe tem a sua tela, com a mesma linguagem, mais compacta no computador.

## O que

As telas do `apps/frontend` (React 19 + Vite) para os cinco perfis da API pronta, os componentes que faltam no `packages/style-guide` e dois ajustes pequenos no backend, para a apresentação das três cenas da Dona Maria.

## Por que

- A API já faz todo o fluxo; sem telas, a banca não vê nada.
- O público principal é idoso, de baixa renda e com pouca familiaridade com celular (referência negativa: AquiTemRemédio, nota 1,3).
- O grupo pediu foco em design próprio e acessibilidade: **não pode parecer painel genérico feito por IA**.

## Quem usa e onde

| Perfil                                              | Aparelho             | Prioridade de design                |
| --------------------------------------------------- | -------------------- | ----------------------------------- |
| Paciente (Dona Maria)                               | **celular**          | máxima: letra grande, poucos passos |
| Profissional da farmácia (farmacêutico ou auxiliar) | computador do balcão | rapidez e clareza                   |
| Entregador do programa municipal                    | celular              | botões grandes, uso na rua          |
| Atendente do fornecedor                             | computador           | lista simples                       |
| Gestor                                              | computador           | painel de leitura                   |

## Metas, não-metas e anti-metas

**Metas**

- As três cenas e o fechamento da apresentação feitos **pelas telas**, cada ator no seu login, com as mudanças aparecendo sozinhas nas outras telas em poucos segundos.
- Acessibilidade WCAG 2.2 nível **AA no mínimo, AAA no contraste de texto**, conferida automaticamente nos testes e à mão com leitor de tela em uma passada.
- Componentes novos no style-guide, cada um com story no Storybook.

**Não-metas**

- App nativo, instalação como PWA, uso offline, notificação push/SMS.
- Mapa dentro do app (a rota abre no Google Maps).
- Tradução para outros idiomas; modo escuro.
- Telas para tudo que a API oferece além do fluxo: ficam de fora edição de cadastro de fornecedor e ajuste fino de estoque além do descrito aqui.

**Anti-metas (falharia mesmo funcionando)**

- Cara de painel genérico: cartões cinza todos iguais com a mesma sombra, degradês decorativos, títulos com rótulo em MAIÚSCULAS em cima, metadados separados por "·", setas "→" nos botões, ícones sem texto.
- Informação passada **só por cor** (toda cor vem com palavra ou ícone).
- Paciente tendo que entender termo técnico ("dispensação", "fulfillment", "CNES", "status").
- Texto da tela diferente do botão que levou até ela (o botão "Receber em casa" leva a uma tela que fala "receber em casa").

## Direção visual: Receituário e tarja (escolhida pelo grupo)

### Cores (tokens)

| Token                  | Valor     | Uso                                                         |
| ---------------------- | --------- | ----------------------------------------------------------- |
| `--color-ink`          | `#1F3F8F` | tinta azul: títulos, botão principal, links, foco           |
| `--color-paper`        | `#FFFFFF` | fundo                                                       |
| `--color-rule`         | `#D6E0F3` | linhas da receita (só como divisória entre seções)          |
| `--color-text`         | `#1A1A1A` | texto                                                       |
| `--color-text-muted`   | `#4A4A4A` | texto secundário (contraste ≥ 7:1 no branco)                |
| `--color-ok`           | `#1E7A46` | "tem", "deu certo"                                          |
| `--color-tarja-red`    | `#C8102E` | tarja vermelha, "em falta", erro                            |
| `--color-tarja-black`  | `#000000` | tarja preta (controle especial)                             |
| `--color-attention-bg` | `#FFF4D6` | fundo de aviso de atenção (com borda e ícone, nunca só cor) |

Os tokens atuais (`--color-primary` vermelho, Inter) são substituídos. O `Button` e o `Card` existentes passam a usar os novos tokens.

### Letra

- **Atkinson Hyperlegible** (400 e 700) em tudo, criada para baixa visão. Servida pelo próprio app (pacote `@fontsource/atkinson-hyperlegible`), sem buscar fonte em servidor externo.
- Escala do celular (paciente e entregador): base **20 px**, títulos 28/24 px, texto secundário mínimo 17 px, altura de linha 1,5.
- Escala do computador: base **16 px**, títulos 24/20 px, mínimo 14 px.
- Sem MAIÚSCULAS em rótulos; frases em caixa normal; texto alinhado à esquerda; linhas de no máximo ~70 caracteres.

### Elementos que dão a identidade

- **Tarja:** faixa na base de cada remédio, igual à da caixa: nenhuma (sem receita), **vermelha** (precisa de receita: simples ou antimicrobiano) ou **preta** (controle especial). Sempre acompanhada do texto: "Não precisa de receita", "Leve a receita", "Receita retida na farmácia".
- **Carimbo:** situação curta em moldura levemente inclinada: "Em falta" (vermelho), "Tem" (verde), "Entregue" (verde). Usado só para situação, no máximo um por item.
- **Linha da receita:** separa seções, como as pautas do receituário. Nunca atrás de texto.
- **Botões:** principal em tinta azul cheia; secundário com borda azul de 3 px; altura mínima **56 px** no celular e 44 px no computador; texto do botão é a ação ("Confirmar pedido", "Receber em casa").
- **Movimento:** só quando responde a uma ação (carimbo "aparece" ao confirmar). Respeita `prefers-reduced-motion`.

## Acessibilidade (requisitos)

- Contraste de texto ≥ 7:1 (AAA); componentes e foco ≥ 3:1.
- Foco do teclado sempre visível (anel de 3 px na tinta azul com folga branca).
- Alvos de toque ≥ 56 × 56 px no celular, ≥ 44 × 44 px no computador.
- Todo campo com rótulo visível; erro escrito embaixo do campo, ligado por `aria-describedby`, dizendo o que fazer.
- Estrutura semântica: um `h1` por tela, `main`, `nav`, listas como listas, tabelas como tabelas.
- Atualizações que chegam sozinhas (aviso novo, pedido mudou) anunciadas por região `aria-live="polite"`.
- Zoom do navegador até 200% sem quebrar nem rolar para o lado no celular.
- Nada depende só de cor; ícones decorativos com `aria-hidden`, ícones que agem com rótulo.
- Linguagem simples, voz ativa, frases curtas.

## Telas

### Paciente (celular) — direção aprovada nos rascunhos

| Tela                     | Conteúdo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Cena |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| **Entrar**               | e-mail e senha grandes; link "Criar conta"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | —    |
| **Criar conta**          | em passos curtos (um assunto por tela): nome, data de nascimento, Cartão SUS, telefone, endereço, unidade de referência (lista da API), **"Usar minha localização" (opcional: o celular pede permissão; quem recusar segue sem a distância)**, "tenho dificuldade para me locomover", prioridade (crônico, oncológico, doença rara) com o consentimento explicado em uma frase                                                                                                                                                                                                                                                                                               | —    |
| **Início**               | "Olá, Maria", nome da unidade dela; **o aviso mais importante em destaque** (some se não há novidade); três botões grandes: **Procurar remédio**, **Meus pedidos**, **Avisos (n)**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 1–3  |
| **Procurar remédio**     | campo grande "Qual remédio você precisa?" com sugestões enquanto digita (cada uma com nome e tarja)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 1    |
| **Onde tem** (resultado) | primeiro a unidade dela ("A UBS Centro está sem", carimbo); depois **a mais próxima que tem** ("Tem na UBS Jardim São Sebastião, a 1,1 km, atualizado há 2 h") com a tarja do remédio; dois botões: **Vou buscar lá** e **Não consigo ir — receber em casa**; link "Ver outras unidades". Se ninguém da rede tem: "Este remédio está em falta na rede" e o botão **Pedir assim mesmo** (a farmácia coloca na lista de espera); a tela de confirmação então pergunta **"Quando chegar, como você quer receber?"** com dois botões grandes (Buscar na farmácia / Receber em casa), já marcado "Receber em casa" se ela disse no cadastro que tem dificuldade para se locomover | 1, 3 |
| **Outras unidades**      | lista de todas as unidades com carimbo, distância e atualização; Farmácia Popular marcada "Só consulta: ligue antes" com o telefone                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 1    |
| **Vou buscar lá**        | endereço, horário, telefone, botão **Abrir o caminho no mapa** (link de rota da API; sem localização da paciente, abre o mapa pelo endereço da unidade). Não cria pedido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 1    |
| **Confirmar pedido**     | remédio e quantidade, **receita** (escolher uma receita válida já cadastrada ou digitar uma nova em passos), endereço de entrega (se for em casa), quem pode receber (ela e responsáveis); botão **Confirmar pedido**                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 2, 3 |
| **Seu pedido**           | linha do tempo simples, um passo por situação, com o passo atual destacado e **o horário só no passo atual** ("desde 10h32"); passos já feitos aparecem marcados, sem horário; previsão de chegada quando houver; posição na lista de espera ("Você é a 2ª da lista"); botão **Cancelar pedido** só quando a API permite                                                                                                                                                                                                                                                                                                                                                     | 2, 3 |
| **Meus pedidos**         | lista dos pedidos, mais recentes primeiro, cada um com a situação em palavras                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | —    |
| **Avisos**               | lista dos avisos, os não lidos marcados (com palavra, não só cor); tocar marca como lido e abre o pedido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 2, 3 |
| **Meus dados**           | contato, endereço, unidade, responsáveis (adicionar/remover), prioridade e **retirar consentimento**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | —    |

Linguagem do paciente: "Seu pedido", "chegou", "saiu para entrega", nunca "status", "dispensado", "fulfillment".

### Profissional da farmácia (computador) — lista + detalhe (aprovado)

Abas no topo, cada uma com o número de pendências: **Pedidos · Transferências · Compras · Estoque · Entregas**.

- **Pedidos:** fila à esquerda (filtro por situação), pedido aberto à direita com paciente (nome ou nome social, idade, Cartão SUS, telefone, endereço se for entrega), responsáveis, receita (dados + **Conferir receita**), estoque da unidade, **dica da rede** ("Tem na UBS Jardim (120) e na Vila Negri (25)") e o **próximo passo sugerido** como botão principal. Ações conforme a situação: Separar, Conferir receita, Entregar no balcão (paciente ou responsável), Agendar entrega (janela de horário), Pedir à unidade X, Pedir ao fornecedor (escolhendo o fornecedor quando for uma compra nova).
- **Transferências:** "Pedidos para nós" (Enviar / Recusar com motivo) e "Nossos pedidos" (Recebido).
- **Compras:** pedidos ao fornecedor com situação, previsão e o lote enviado; **Dar entrada** quando chega; fila de espera daquele remédio (posição, nome, categoria de prioridade e faixa de idade — nunca diagnóstico).
- **Estoque:** por remédio, com lotes, validade (lotes vencendo destacados com texto), reservado e mínimo; **Dar entrada em lote**, **Baixar perda**, **Mudar mínimo**; **Cadastrar medicamento** com todas as características (princípio ativo, concentração, forma, via, unidade, componente, classe, tipo de receita, conservação, RENAME, Farmácia Popular).
- **Entregas:** entregas da unidade e a situação de cada uma.
- **Auxiliar de farmácia:** mesma tela; ações que só o farmacêutico pode fazer (conferir e entregar antimicrobiano e controlado) aparecem desabilitadas com o texto "Só o farmacêutico".

### Entregador (celular)

Duas abas: **Disponíveis** e **Minhas**. Antes de aceitar: bairro e cidade, unidade de retirada, janela de horário, "Refrigerado" quando for o caso, botão **Aceitar entrega** (nada de nome, endereço ou remédio). Depois de aceitar: nome, endereço, telefone (link para ligar), remédio e três botões: **Retirei na unidade**, **Entreguei** (pede o nome de quem recebeu) e **Não consegui entregar** (pede o motivo).

### Fornecedor (computador)

Lista de pedidos de compra feitos a ele: remédio, quantidade, unidade, quantos pacientes esperam, há quanto tempo. Ações: **Confirmar prazo** (data), **Ainda sem prazo**, **Enviar** (nota fiscal, lote, validade, quantidade).

### Gestor (computador)

**Painel:** três números grandes (buscas sem estoque nos últimos 7 dias, lotes vencendo em 60 dias, pacientes na fila), gráfico de barras horizontais "Remédios mais procurados sem estoque" (com o número escrito em cada barra e tabela equivalente para leitor de tela), lista de lotes perto de vencer. **Contas:** criar profissional (farmacêutico com CRF/UF ou auxiliar), atendente de fornecedor, entregador ou gestor. **Medicamentos:** o mesmo cadastro da farmácia.

### Comum

- **Entrar** é uma tela só para todos; depois do login vai para a tela inicial do perfil.
- **Sair** sempre visível no topo (computador) ou em "Meus dados" (celular).
- Carregando, erro e vazio tratados em toda tela que busca dados, com texto que diz o que fazer ("Não foi possível carregar seus pedidos. Verifique a internet e toque em Tentar de novo.").
- Sessão expirada (401) leva para **Entrar** com a mensagem "Sua sessão terminou. Entre de novo."

## Componentes do style-guide

Existentes, reestilizados com os novos tokens: `Button` (ganha tamanho mínimo e variante de perigo), `Card`.

Novos (cada um com story e CSS só com tokens):

| Componente                                          | Para quê                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Tarja`                                             | faixa + texto do tipo de receita (`none`, `simple`, `antimicrobial`, `special_control`) |
| `Stamp` (carimbo)                                   | situação curta: "Em falta", "Tem", "Entregue"…                                          |
| `Notice`                                            | aviso em destaque (sucesso, atenção, erro) com ícone e texto                            |
| `SearchField`                                       | campo grande de busca com sugestões acessíveis (padrão combobox)                        |
| `TextField`, `SelectField`, `DateField`, `Checkbox` | formulários com rótulo, ajuda e erro                                                    |
| `Timeline`                                          | linha do tempo do pedido                                                                |
| `Tabs`                                              | abas do computador, com contador                                                        |
| `ListDetail`                                        | lista + painel de detalhe (farmácia)                                                    |
| `ActionList`                                        | botões grandes empilhados (início do paciente, entregador)                              |
| `StatTile`                                          | número grande do painel do gestor                                                       |
| `BarList`                                           | barras horizontais com valor escrito                                                    |
| `DataTable`                                         | tabela simples (estoque, compras, gestor)                                               |
| `EmptyState`, `ErrorState`, `Spinner`               | carregando, vazio e erro                                                                |
| `AppHeader`                                         | topo com unidade/perfil e Sair                                                          |

## Ajustes no backend

- `GET /api/pharmacy/network-availability?medicationId=` (profissional): quantidade disponível por unidade pública da rede, para a dica no balcão.
- `GET /api/me/prescriptions?medicationId=` (paciente): receitas da paciente, com tipo, validade e se ainda podem ser usadas, para a tela **Confirmar pedido**.
- Seed: tirar a losartana da Farmácia Municipal, para a UBS Jardim ser a mais próxima com o remédio na cena 1.
- `GET /api/auth/me` passa a trazer o perfil de quem entrou: para profissional, a unidade (id e nome) e a ocupação (farmacêutico ou auxiliar); para fornecedor, o nome do fornecedor; para paciente, nome (ou nome social) e unidade de referência. Isso alimenta o `AppHeader` e deixa os botões "Só o farmacêutico" desabilitados antes do clique.
- `GET /api/suppliers` (profissional e gestor): lista de fornecedores, para "Pedir ao fornecedor" e para o gestor criar atendente de fornecedor.
- `GET /api/manager/summary` (gestor): os três números do painel (buscas sem estoque em 7 dias, lotes vencendo em 60 dias, pacientes na fila de espera em toda a rede).

## Decisões já tomadas

### Pelo grupo

- Paciente usa **no celular**; início com **poucos botões grandes** e o aviso em destaque.
- Resultado da busca com **uma resposta e duas escolhas**.
- Pedido "receber em casa": confirmar → linha do tempo → aviso no início.
- Farmácia em **lista + detalhe** com próximo passo sugerido; entregador, fornecedor e gestor como nos rascunhos.
- Direção visual **Receituário e tarja**.
- Bibliotecas: **React Router** (telas) e **TanStack Query** (dados e atualização a cada poucos segundos).
- Pacotes de apoio aprovados (2026-11-04): `@fontsource/atkinson-hyperlegible`, **Vitest + Testing Library**, `vitest-axe` e **Playwright**.
- **Localização do paciente** (decisão delegada a mim e registrada aqui): botão opcional "Usar minha localização" no cadastro e em "Meus dados", usando a localização do celular (`navigator.geolocation`) só quando a pessoa toca no botão. Sem localização, a tela de resultado mostra a unidade sem os quilômetros ("Tem na UBS Jardim São Sebastião") e o botão de caminho abre o mapa pelo **endereço** da unidade. Não há serviço de mapas pago nem conversão de endereço em coordenadas.

### Escolhas minhas (podem ser revistas)

- Atualização "ao vivo" por consulta a cada **3 s** nas telas de acompanhamento (pedido, avisos, listas da farmácia, entregador) e 30 s nas demais; para quando a aba não está visível.
- Fonte servida pelo próprio app (`@fontsource/atkinson-hyperlegible`).
- Testes do frontend com **Vitest + Testing Library**, e checagem automática de acessibilidade com **axe** (`vitest-axe`) em cada tela.
- **Playwright** para as três cenas de ponta a ponta no navegador (Chromium, com o celular emulado para paciente e entregador), contra o backend real com o banco de teste carregado pelo seed; cada ator num contexto de navegador separado, como na apresentação. Também roda a checagem de acessibilidade (axe) nas telas principais.
- Celular primeiro para paciente e entregador (pensado em 360 px de largura); computador a partir de 1024 px para os demais, funcionando também em tablet.
- Endereços de tela em português (`/buscar`, `/pedidos/:id`, `/farmacia/pedidos`).
- Três leituras novas no backend além das duas previstas (perfil em `/auth/me`, lista de fornecedores, resumo do gestor) — sem elas, telas da cena 3 e do gestor não funcionam.
- Linha do tempo com horário só no passo atual (guardar o histórico de cada mudança exigiria uma tabela nova no banco).
- "Pedir assim mesmo" pergunta como receber, já marcando entrega para quem tem dificuldade de locomoção.

## Onde

| Caminho                                            | O que entra                                             |
| -------------------------------------------------- | ------------------------------------------------------- |
| `packages/style-guide/src/tokens/`                 | tokens novos                                            |
| `packages/style-guide/src/components/<Nome>/`      | componentes novos + stories                             |
| `apps/frontend/src/api/`                           | funções tipadas por recurso (sem `fetch` em componente) |
| `apps/frontend/src/pages/<perfil>/`                | telas por perfil                                        |
| `apps/frontend/src/app/`                           | rotas, guarda de perfil, cliente de dados               |
| `apps/backend/src/routes/` + `src/db/seed-data.ts` | os dois endpoints e o ajuste do seed                    |
| `apps/frontend/e2e/`                               | testes Playwright das três cenas                        |
| `docs/`                                            | registro da implementação                               |

## Deixado para quem implementar

- Organização interna de pastas além da tabela acima, nomes de componentes internos e hooks.
- Ícones (desde que simples, com texto ao lado e acessíveis).
- Detalhes de espaçamento e layout dentro das regras de tokens e acessibilidade.

## Histórico de alterações

| Data       | O que mudou                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-04 | Versão inicial                                                                                                                                                      |
| 2026-11-04 | Revisão: três leituras novas no backend, horário só no passo atual, "Pedir assim mesmo" pergunta como receber, localização opcional, pacotes aprovados e Playwright |
| 2026-11-04 | Implementado; desvios e decisões tomadas durante a implementação estão em [2026-11-04-frontend.md](2026-11-04-frontend.md)                                          |
