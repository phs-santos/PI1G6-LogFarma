# PI1G6-LogFarma — Grupo PI 6

Monorepo do projeto **Localização, Reposição e Entrega de Medicamentos**. Tudo (API, telas, design system e infraestrutura) vive aqui, num único repositório e num único workspace pnpm.

## Mapa do monorepo

| Pasta | Pacote | O que é | Porta |
|---|---|---|---|
| `apps/backend/` | `@fatec-pi/backend` | API — Node + Fastify 5 + TS (ESM) | 3333 |
| `apps/frontend/` | `@fatec-pi/frontend` | Telas — React 19 + Vite + TS | 5173 |
| `packages/style-guide/` | `@fatec-pi/style-guide` | Design system — tokens CSS + componentes React + Storybook | 6006 |
| `infra/` | — | Docker Compose (dev e produção) e scripts de deploy/backup | — |
| `docs/` | — | Registro de tudo que foi feito: o que, por que, onde, escolhas e datas | — |

Cada pasta tem o seu `CLAUDE.md`/`AGENTS.md` com as convenções específicas. Leia o da pasta onde vai mexer.

- O frontend usa o style-guide como `"@fatec-pi/style-guide": "workspace:*"` — a mudança no style-guide aparece no frontend na hora, sem publicar nada.
- O frontend chama o backend por `/api/...` (proxy do Vite para `localhost:3333`).
- Ordem para features que atravessam pacotes: **style-guide → backend → frontend** (pode ser no mesmo PR).

## Comandos (na raiz)

```bash
pnpm install          # instala tudo (um lockfile só, na raiz)
pnpm dev              # backend + frontend juntos
pnpm dev:backend      # só a API
pnpm dev:frontend     # só as telas
pnpm storybook        # style-guide em http://localhost:6006
pnpm typecheck        # todos os pacotes — obrigatório antes de considerar pronto
pnpm build            # todos os pacotes
pnpm docker:dev       # banco + backend + frontend no Docker (infra/compose.yaml)
```

Para rodar um script de um pacote só: `pnpm --filter @fatec-pi/<pacote> <script>`.
Para adicionar dependência: `pnpm --filter @fatec-pi/<pacote> add <lib>` (nunca na raiz, a não ser ferramenta do monorepo).

## Regras para agentes (Claude Code, Codex e afins)

### Pode fazer sem perguntar

- Ler qualquer arquivo do repositório (exceto `.env` e segredos).
- Criar e editar código, testes, estilos e documentação **dentro do escopo da tarefa pedida**.
- Rodar `pnpm install`, `pnpm typecheck`, `pnpm build`, `pnpm dev`, `pnpm storybook` e comandos de leitura do git (`status`, `diff`, `log`).
- Subir o ambiente local com `pnpm docker:dev` para testar.
- Criar/atualizar arquivos em `docs/` (é obrigatório — ver abaixo).

### Precisa perguntar antes

- Fazer commit, criar branch, abrir PR ou fazer push.
- Adicionar ou trocar biblioteca (router, estado global, ORM, UI kit, etc.).
- Decidir algo listado em **Decisões em aberto** (banco, autenticação, rede coberta, integrações reais).
- Mexer em `infra/` (compose, scripts de deploy/backup) ou em `.github/workflows/`.
- Apagar arquivos ou mudar a API pública de um componente do style-guide ou de uma rota do backend.
- Qualquer coisa fora do escopo do que foi pedido.

### Nunca

- Ler, copiar ou exibir `.env`, chaves, tokens ou senhas.
- Rodar deploy, backup ou restore de produção, ou acessar a VPS.
- Fazer `push --force`, reescrever histórico da `main` ou apagar branches remotas.
- Logar ou expor dados pessoais de paciente (LGPD).
- Silenciar erro de tipo com `any`, `@ts-ignore` ou desligando regra para "passar".
- Usar npm ou yarn.

### Sempre

1. **Explicar o que foi feito de forma lúdica.** Ao terminar, conte em poucas linhas, com uma analogia do dia a dia, o que mudou e por quê — de um jeito que alguém do grupo que não acompanhou entenda. Depois, os detalhes técnicos.
2. **Documentar em `docs/`.** Toda tarefa concluída gera ou atualiza um arquivo em `docs/` seguindo o modelo de [`docs/README.md`](docs/README.md): **O que**, **Por que**, **Onde**, **Escolhas feitas**, com a **data de implementação** e, a cada mudança posterior, a **data de alteração**.
3. Confirmar que `pnpm typecheck` (e `pnpm build`, quando aplicável) passa antes de dizer que terminou.

## Regras gerais de código

- Código e comentários em português do Brasil; nomes de variáveis/funções em inglês (ver glossário).
- Use **pnpm**, nunca npm/yarn.
- TS strict; sem `any` — use `unknown` e estreite.
- Mensagens de commit em português, no imperativo (`adiciona rota de login`). Cite o requisito quando houver (ex.: `RF03`).

---

## Projeto: Localização, Reposição e Entrega de Medicamentos

Projeto Integrador I (ADS noturno, Fatec Taquaritinga, 2026). Orientador: Prof. Gabriel Passatuto Gallo.
Grupo: Arthur Vinicius Ferreira, Bruno Henrique Jacinto, Lorena Duarte Malaguti, Paulo Henrique de Souza Santos.

Fonte da verdade do domínio: documento e slides do PI (pasta `contexto/` do material do grupo). Em caso de dúvida sobre regra de negócio, pergunte antes de inventar.

### O produto

Sistema que mostra **em tempo real onde um medicamento essencial está disponível** na rede do Farmácia Popular (PFPB) e do SUS, leva o paciente à unidade mais próxima e oferece alternativas quando ele não pode ir até lá (transferência entre unidades, entrega em casa, lista de espera).

- **Problema:** o paciente só descobre que o remédio está em falta quando chega ao balcão. Desabastecimento atinge 82% dos municípios (CNM). Falta de acesso leva à interrupção do tratamento.
- **Público principal:** pessoas idosas, de baixa renda ou em vulnerabilidade, com pouca mobilidade. **Isso orienta a UI:** textos simples, fonte legível, alto contraste, poucos passos, boa acessibilidade (a referência negativa é o app AquiTemRemédio, nota 1,4).
- **Stakeholders:** farmácias credenciadas ao PFPB, departamentos farmacêuticos de hospitais do SUS, Ministério da Saúde/gestores do SUS.

#### Fora do escopo

- Não vende nem comercializa medicamentos (não é um Consulta Remédios).
- Não substitui prescrição nem faz avaliação clínica.
- Não cobre farmácias privadas fora da rede credenciada ao PFPB.
- Não resolve a causa-raiz do desabastecimento (orçamento/planejamento público).

### Atores

| Ator | Papel |
|---|---|
| Paciente | Busca o medicamento, recebe notificações, escolhe retirar ou receber em casa |
| Farmacêutico / unidade | Consulta estoque, dispensa, registra pedido ao fornecedor |
| Fornecedor | Confirma (ou não) prazo de entrega de um pedido de reposição |
| Unidade parceira | Recebe pedidos de transferência entre farmácias da rede |
| Logística / entrega | Motoboy, parceiro logístico ou Correios para entrega domiciliar |

### Requisitos

**Funcionais**
- **RF01** Consultar estoque local de um medicamento.
- **RF02** Consultar disponibilidade na rede de farmácias parceiras.
- **RF03** Indicar a unidade mais próxima com o medicamento e calcular a rota.
- **RF04** Registrar pedido de compra ao fornecedor quando não há estoque na rede.
- **RF05** Notificar o paciente sobre prazo de reposição ou chegada.
- **RF06** Inscrever o paciente em lista de espera com alerta automático.
- **RF07** Solicitar e gerenciar transferência entre unidades.
- **RF08** Acionar entrega no domicílio.

**Não funcionais**
- **RNF01** Consulta de estoque responde em menos de 10 s.
- **RNF02** Disponibilidade ~99%, sem queda em horário de atendimento.
- **RNF03** Dados de paciente e prescrição protegidos conforme a **LGPD** (não logar dados pessoais, não expor em respostas desnecessárias).
- **RNF04** Escalável para outras redes municipais/estaduais.

Ao implementar algo ligado a um requisito, cite o código (ex.: `// RF03`) no commit ou no comentário da função principal.

### Fluxo principal

1. Paciente busca um medicamento (app ou balcão).
2. Sistema consulta o **estoque local**. Se atende → dispensa no balcão (fim).
3. Se não atende → consulta a **rede**. Em paralelo, se o estoque local ficou abaixo do **mínimo**, dispara reposição ao fornecedor sem bloquear o atendimento.
4. Se alguma unidade tem → indica a mais próxima + rota.
   - Paciente consegue ir → retira na unidade parceira (fim).
   - Não consegue → **transferência** para unidade mais acessível.
5. Se ninguém tem → **pedido de compra** ao fornecedor.
   - Fornecedor confirma prazo → notifica paciente com estimativa e opções.
   - Não confirma → **lista de espera** com alerta, priorizando pacientes **crônicos, oncológicos e de doenças raras**.
6. Medicamento chega (transferência ou reposição) → atualiza status do pedido.
   - Paciente consegue buscar → retirada (fim).
   - Não consegue → **entrega domiciliar** (etapa crítica).

### Glossário (termo → nome no código)

Código em inglês, UI e comentários em português. Use estes nomes para manter consistência entre backend e frontend:

| Domínio | Código |
|---|---|
| Medicamento | `Medication` |
| Unidade / farmácia | `Pharmacy` |
| Estoque (item por unidade) / estoque mínimo | `StockItem` / `minQuantity` |
| Paciente | `Patient` |
| Dispensação | `Dispensation` |
| Transferência entre unidades | `Transfer` |
| Pedido de compra ao fornecedor | `PurchaseOrder` |
| Fornecedor | `Supplier` |
| Lista de espera / prioridade | `WaitlistEntry` / `priority` |
| Entrega domiciliar | `Delivery` (`method`: `motoboy` \| `logistics_partner` \| `correios`) |
| Notificação | `Notification` |

### Decisões em aberto

Não assuma uma resposta sem perguntar ao usuário:
- Rede coberta: só PFPB/SUS ou também farmácias privadas parceiras.
- Banco de dados, autenticação e perfis de acesso (ainda não definidos no código).
- Integração real de estoque, mapas/rotas e logística (na POC/MVP, usar dados simulados/mock).
- Futuro, fora do MVP: módulo de adesão ao tratamento e programa de entrega voluntária.
