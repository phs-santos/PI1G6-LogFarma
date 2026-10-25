# frontend — Grupo PI 6

Telas do sistema (`@fatec-pi/frontend`). React 19 + Vite + TypeScript. Entrada em `src/main.tsx`, componente raiz em `src/App.tsx`.

## Comandos

```bash
pnpm install      # precisa de chave SSH no GitHub (o style-guide é repo privado)
pnpm dev          # http://localhost:5173 — /api/* vai para o backend em localhost:3333
pnpm typecheck    # obrigatório antes de considerar pronto
pnpm build
pnpm update @fatec-pi/style-guide   # puxa a versão mais recente da main do style-guide
```

Para rodar a tela completa, suba também o [backend](https://github.com/Grupo-PI-6/backend) (`pnpm dev` lá).

## Convenções

- Componentes funcionais com export nomeado (`export function Pagina()`), um por arquivo, PascalCase.
- Estrutura conforme crescer:
  - `src/pages/` — telas (uma pasta por página)
  - `src/features/<dominio>/` — lógica e componentes específicos de um domínio
  - `src/api/` — funções de acesso à API (`fetch` tipado, tipos espelhando o contrato do backend); nunca `fetch` direto dentro de componente
  - `src/hooks/` — hooks reutilizáveis
- UI **só** via `@fatec-pi/style-guide`. Se faltar um componente genérico (Input, Modal…), **pare** e informe qual componente e props são necessários — ele nasce no repo `style-guide`, não aqui.
- Estilo local mínimo: layout (grid/flex/margens) é ok, sempre com tokens `var(--space-*)`. Nada de hex/px soltos.
- Chamadas à API usam caminho relativo `/api/...`.
- Trate carregamento, erro e vazio em toda tela que busca dados.
- Pense no público (idosos, baixa visão, pouca familiaridade com apps): textos claros, poucos passos, contraste alto.
- Sem bibliotecas novas (router, estado global, query) sem confirmar com o usuário.

## Trabalhando no style-guide ao mesmo tempo

Clone o `style-guide` ao lado deste repo e rode `pnpm link ../style-guide` para usar a cópia local. Para voltar à versão do GitHub: `pnpm unlink @fatec-pi/style-guide && pnpm install`. Nunca faça commit do `package.json` com `link:`.

## Repositórios do grupo (org `Grupo-PI-6`)

| Repo | O que é | Porta |
|---|---|---|
| [`Grupo-PI-6/frontend`](https://github.com/Grupo-PI-6/frontend) | Telas — React 19 + Vite + TS | 5173 |
| [`Grupo-PI-6/backend`](https://github.com/Grupo-PI-6/backend) | API — Node + Fastify 5 + TS (ESM) | 3333 |
| [`Grupo-PI-6/style-guide`](https://github.com/Grupo-PI-6/style-guide) | Design system — tokens CSS + componentes React + Storybook | 6006 |

Ordem para features que atravessam repos: **style-guide → backend → frontend**.
O frontend consome o style-guide como dependência git (`@fatec-pi/style-guide`) e chama o backend por `/api/...` (proxy do Vite para `localhost:3333`).

## Regras gerais

- Código e comentários em português do Brasil; nomes de variáveis/funções em inglês (ver glossário).
- Use **pnpm** (`pnpm install`), nunca npm/yarn.
- TS strict; sem `any` — use `unknown` e estreite.
- Uma tarefa só está pronta quando `pnpm typecheck` passa (e `pnpm build`, quando aplicável).
- Não faça commit sem o usuário pedir. Mensagens em português, no imperativo (`adiciona rota de login`).

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
