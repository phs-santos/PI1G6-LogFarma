# Menu lateral da equipe e listas da gestão

- **Implementado em:** 2026-11-06
- **Última alteração:** 2026-11-06
- **Requisitos:** RNF03

## Em poucas palavras

Antes, cada perfil da equipe tinha um corredor diferente: abas no topo na farmácia e na gestão, um cabeçalho azul no fornecedor. Agora todo mundo entra pelo mesmo prédio, com o menu na parede da esquerda, como o paciente. Na gestão, cada sala abre com um "arquivo" (a lista); para guardar algo novo, abre-se uma gaveta por cima (o diálogo) e ninguém precisa sair da sala.

## O que

- **Menu lateral em todos os perfis** (`StaffLayout` com o `AppShell` do style-guide): farmácia, fornecedor, gestão e entregador. No fim do menu: onde a pessoa trabalha, o nome e "Sair". Farmácia mostra o número de pendências em Pedidos e Transferências. As abas do topo (`Tabs`) saíram das páginas.
- **Gestão — cada área abre numa lista; criar e editar são diálogos:**
    - **Usuários** (`/gestao/usuarios`): contas da equipe com filtro por perfil, situação e "Desativar"/"Reativar" (desativar pede confirmação). "Criar conta" abre o formulário num diálogo. Pacientes não aparecem (RNF03).
    - **Medicamentos** (`/gestao/medicamentos`): catálogo em ordem alfabética, com busca e páginas de 25. "Cadastrar medicamento" e "Editar" abrem o formulário num diálogo.
    - **Unidades** (`/gestao/unidades`): tipo, rede, endereço, telefone e horário.
    - Endereços antigos `/gestao/contas` e `/gestao/medicamentos/novo` levam às listas.
- **Componente novo `Dialog`** no style-guide: janela com título, "✕ Fechar" e conteúdo livre (formulários), no `<dialog>` nativo.
- **API:**
    - `GET /api/manager/medications?search=&page=` → `{ items, total, page, pageSize }`
    - `GET /api/manager/users?role=` → contas da equipe (`StaffAccount`), sem pacientes
    - `PATCH /api/manager/users/:id` `{ active }` → ativa/desativa; o gestor não desativa a si mesmo; paciente responde 404
- **Conta desativada perde o acesso na hora:** `requireAuth` confere se a conta continua ativa a cada requisição (antes valia até o cookie vencer).

## Por que

Pedidos do Paulo: todos os painéis no padrão do menu lateral; o administrador precisa listar remédios, usuários e unidades; "a tela padrão é listagem e para criar é dialog".

## Onde

- `packages/style-guide/src/components/Dialog/` — componente novo
- `apps/frontend/src/app/layouts/StaffLayout.tsx` (era `DesktopLayout`), `CourierLayout.tsx`
- `apps/frontend/src/pages/farmacia/PharmacyNav.tsx` (era `PharmacyTabs`), `apps/frontend/src/pages/gestor/ManagerNav.tsx` (era `ManagerTabs`), `apps/frontend/src/ui/NavCount.tsx`
- `apps/frontend/src/pages/gestor/Usuarios.tsx`, `Medicamentos.tsx`, `Unidades.tsx`, `ContaForm.tsx` (era a tela `Contas`), `roleText.ts`
- `apps/backend/src/services/admin.ts`, `apps/backend/src/routes/manager.ts`, `apps/backend/src/auth/guards.ts`
- Testes: `apps/backend/test/admin.test.ts` (5), `Gestor.test.tsx` (+5), `Dialog.test.tsx` (3)

## Escolhas feitas

| Escolha                                         | Alternativas consideradas   | Motivo                                                                               |
| ----------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| Um `StaffLayout` para todos os perfis da equipe | Um layout por perfil        | Mesmo padrão em todo lugar; só os itens do menu mudam                                |
| Criar/editar em diálogo                         | Tela própria por formulário | Pedido do Paulo; a lista continua à vista e atualiza ao salvar                       |
| Conferir `active` a cada requisição             | Só no login                 | Desativar precisa cortar o acesso na hora; o custo é uma consulta por chave primária |
| Pacientes fora da lista de usuários             | Listar todos                | O gestor não precisa de dado pessoal de paciente (RNF03)                             |
| Gestor não desativa a si mesmo                  | Permitir                    | Evita a rede ficar sem nenhum gestor por engano                                      |
| Farmácia mantém a tela "Cadastrar medicamento"  | Diálogo também              | A regra de diálogo é das telas de administração; a farmácia não é admin              |

## Como testar

```bash
pnpm --filter @fatec-pi/backend test      # test/admin.test.ts
pnpm --filter @fatec-pi/frontend test     # Gestor.test.tsx
pnpm --filter @fatec-pi/style-guide test  # Dialog.test.tsx
```

Na mão: entre com `gestor@demo.logfarma` (aba "Sou da equipe") e use Usuários, Medicamentos e Unidades no menu.

## Histórico de alterações

| Data       | O que mudou                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-06 | Versão inicial                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-11-06 | Cadastro de medicamento em três blocos (Identificação, Classificação no SUS, Conservação e programas) com até 3 campos por linha no computador, num diálogo mais largo (`Dialog size="xl"`); coluna "Conservação" na lista                                                                                                                                                                          |
| 2026-11-06 | Style-guide: campo de texto e lista de opções com a mesma altura; em campos lado a lado, os controles ficam alinhados pela base mesmo quando só um tem texto de ajuda                                                                                                                                                                                                                               |
| 2026-11-06 | Diálogos (`Dialog` e `ConfirmDialog`, hook `useModalDialog`): travam a rolagem da página de trás e fecham com clique fora (no fundo escuro), além de Esc e "Fechar"                                                                                                                                                                                                                                 |
| 2026-11-06 | **Cabeçalho padrão de tela** (`PageHeader` no style-guide): título, descrição e ações à direita em todas as telas com menu lateral (paciente e equipe, inclusive o Painel); fixo no topo ao rolar no computador. Ficam de fora a Início do paciente (a saudação já é o cabeçalho) e as telas de entrada                                                                                             |
| 2026-11-06 | **Filtro padrão das listas** (`FilterBar` no style-guide): busca que filtra enquanto digita + listas de opções, resumo ("7 medicamentos") e "Limpar filtros". Em Usuários (busca, perfil, situação), Medicamentos (busca e componente do SUS, no servidor), Unidades (busca e tipo), Estoque (busca; abaixo do mínimo; lote vencendo) e Pedidos (busca por remédio ou paciente; em andamento/todos) |
| 2026-11-06 | **Cadastrar unidade** na gestão: diálogo com nome, tipo, rede, endereço, telefone, horário e CNES; rota `POST /api/manager/pharmacies`. `GET /api/manager/medications` aceita `component`                                                                                                                                                                                                           |
| 2026-11-06 | Farmácia: **Dar entrada em lote** e **Cadastrar medicamento** viram diálogos no Estoque (a tela `NovoMedicamento` saiu; `/farmacia/estoque/novo-medicamento` leva ao Estoque). Os diálogos de medicamento ficam em `farmacia/MedicamentoDialogs.tsx`, usados pela farmácia e pela gestão                                                                                                            |
