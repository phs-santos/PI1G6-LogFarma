# Publicação na VPS, catálogo de unidades e medicamentos, logo e cadastro mais fácil

- **Implementado em:** 2026-11-04
- **Última alteração:** 2026-11-04
- **Requisitos:** RF01–RF03, RNF02, RNF03

## Em poucas palavras

O LogFarma saiu do computador e foi para a rua: está no ar em `logfarma.codexolimpo.com.br`, com cadeado (HTTPS). A loja foi abastecida com a prateleira inteira: as unidades de saúde de Taquaritinga, Matão e Monte Alto e quase 300 medicamentos da lista oficial do SUS. A porta de entrada ganhou cara nova, com o logo escolhido pelo grupo. No cadastro, o CEP agora preenche o endereço sozinho, como nos sites de compra, e o telefone aparece com parênteses e traço enquanto a pessoa digita.

## O que

- **Tela Entrar redesenhada:** fundo em tinta azul com a pauta da receita bem leve. No computador, a promessa ("Saiba onde tem o seu remédio antes de sair de casa.") e um exemplo da resposta do app; o formulário é uma folha de receituário com timbre e tarja. Novo botão **Mostrar senha** e aviso "Esqueceu a senha? Peça ajuda no balcão da sua unidade de saúde.".
- **Logo:** a versão horizontal gerada por IA virou SVG no componente `Logo`/`LogoSymbol` do style-guide (versão colorida e branca). Usado na tela Entrar, no Criar conta e no topo do computador (`AppHeader` ganhou a propriedade opcional `brand`). Favicon `favicon.svg` e ícone de tela inicial `apple-touch-icon.png` (180 px).
- **Máscaras:** telefone "(16) 99123-4567", Cartão SUS "898 0012 3456 7890" e CEP "15990-020" no cadastro, em Meus dados e em Contas do gestor. A API continua recebendo só os números.
- **CEP:** no endereço, o CEP vem primeiro; com 8 números o app consulta o **ViaCEP** e preenche rua, bairro, cidade e UF. CEP desconhecido ou sem internet: aviso e preenchimento à mão.
- **Catálogo (`apps/backend/src/db/catalog-data.ts`):** 18 unidades (Taquaritinga, Matão e Monte Alto: UBS, farmácia municipal, farmácia de especializados e Farmácia Popular) e 296 medicamentos da RENAME (189 básicos, 24 estratégicos, 83 especializados; 31 antimicrobianos, 60 de controle especial, 16 refrigerados, 36 no Farmácia Popular). Script `seed-catalog` que **só acrescenta**: não apaga nada e não duplica se rodar de novo.
- **Produção na VPS:** containers em `/root/grupo-pi-6`; banco `logfarma` (usuário próprio) no Postgres que já existia na VPS; domínios no Caddy com HTTPS.

## Por que

- A apresentação e o uso pelo grupo precisam do sistema no ar, com endereço fácil e HTTPS (o cookie de login só é seguro com HTTPS).
- Sem unidades e medicamentos no banco de produção, ninguém conseguia terminar o cadastro nem procurar remédio.
- O público é idoso: digitar CEP é mais fácil que digitar o endereço inteiro, e o número formatado ajuda a conferir.

## Onde

| Caminho                                                                | O que é                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `apps/frontend/src/pages/entrar/`                                      | Tela Entrar e o CSS dela                                                    |
| `packages/style-guide/src/components/Logo/`                            | Logo em SVG (componente, story e teste)                                     |
| `apps/frontend/public/`                                                | `favicon.svg` e `apple-touch-icon.png`                                      |
| `apps/frontend/src/lib/masks.ts`                                       | Máscaras de telefone, Cartão SUS e CEP                                      |
| `apps/frontend/src/api/cep.ts`, `src/pages/paciente/AddressFields.tsx` | Busca de CEP e endereço                                                     |
| `apps/backend/src/db/catalog-data.ts`, `catalog.ts`, `seed-catalog.ts` | Catálogo e carga sem apagar                                                 |
| VPS `/root/grupo-pi-6/.env`                                            | `DATABASE_URL`, `JWT_SECRET` e afins (gerados na própria VPS; nunca no git) |
| VPS `/root/grupo-pi-6/compose.override.yaml`                           | Põe o backend na rede do Postgres da VPS e deixa a porta 8090 só local      |
| VPS `/etc/caddy/sites/logfarma.caddy`                                  | Domínios e HTTPS                                                            |

## Escolhas feitas

| Escolha                                                               | Alternativas consideradas                  | Motivo                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| ViaCEP                                                                | API dos Correios                           | A dos Correios exige contrato e token; o ViaCEP é gratuito, sem chave, e usa a base dos Correios |
| Consulta de CEP direto do navegador                                   | passar pelo backend                        | menos uma peça para manter; se o ViaCEP falhar, a pessoa preenche à mão                          |
| Catálogo separado da demonstração, só acrescentando                   | usar o seed da demonstração                | o seed da demonstração apaga o banco; o catálogo pode rodar em produção sem risco                |
| Unidades com nomes, endereços e telefones fictícios                   | dados reais das prefeituras                | não temos os dados oficiais; o seed já usa dados fictícios no formato certo                      |
| Banco no Postgres que já existia na VPS, com usuário e banco próprios | Postgres próprio no compose                | pedido do grupo; os bancos `telefonia*` da VPS não foram tocados                                 |
| Ajuste de produção num `compose.override.yaml` só na VPS              | mudar o `compose.prod.yaml` do repositório | o repositório continua servindo para quem quiser subir com banco próprio                         |
| Porta 8090 só local, acesso público pelo Caddy                        | porta aberta                               | o site só sai com HTTPS                                                                          |
| Logo em SVG redesenhado a partir da imagem da IA                      | usar o JPG                                 | JPG não fica nítido em 16 px e não funciona sobre o azul                                         |
| Sem animação na entrada da folha                                      | animação de aparecer                       | se a animação não roda (aba em segundo plano), o formulário ficava invisível                     |

## Como testar

```bash
pnpm test && pnpm --filter @fatec-pi/frontend e2e
pnpm --filter @fatec-pi/backend db:catalog        # carrega o catálogo no banco de dev (não apaga nada)
```

Na VPS, depois de publicar a imagem nova:

```bash
ssh vps 'cd ~/grupo-pi-6 && docker compose exec backend node dist/db/seed-catalog.js'
```

## Telas no computador, Início útil e histórico de buscas (alteração)

- **Computador:** a paciente ganhou topo azul com menu (Início, Procurar remédio, Meus pedidos, Avisos, Meus dados) e as telas viraram uma folha branca sobre fundo azul-claro. O Criar conta usa o mesmo desenho do Entrar: painel azul com a lista dos 6 passos e a folha com o formulário.
- **Entrar:** seletor **Sou paciente / Sou da equipe** (padrão paciente). Na equipe, os textos mudam, some o "Criar conta" (contas da equipe são criadas pelo gestor) e o painel mostra um exemplo do balcão. O link `/entrar?perfil=equipe` já abre na equipe. Componente novo no style-guide: `Segmented`.
- **Início:** busca direto na tela, "Você procurou recentemente", pedidos em andamento, avisos recentes e "Bom saber". Os quatro botões grandes ficam só no celular (no computador o menu faz esse papel). Notícias sobre medicamentos ficaram para quando o grupo escolher uma fonte confiável.
- **Procurar:** "Mais procurados" (um toque preenche a busca), buscas recentes com "Limpar histórico" e a mensagem de ajuda sem sobrepor o campo.
- **Histórico de buscas (backend):** tabela `patient_recent_medications` (migração `0002`), uma linha por paciente e remédio; gravada ao abrir "Onde tem"; `GET /api/me/recent-medications` (só a própria paciente) e `DELETE` para limpar. A tabela `search_events`, que alimenta o painel do gestor, continua anônima (LGPD).
- **Detalhes:** mais espaço entre os blocos das telas; sem `?voltar=/` quando a origem é o início; sem moldura no título que recebe o foco; rótulo "Unidade" no cadastro.

## Um só `DATABASE_URL` e senhas novas na VPS (alteração)

- **Repositório:** o `compose.prod.yaml` passa a usar só o `DATABASE_URL` do `.env`. O Postgres próprio do compose virou opcional (perfil `banco-proprio`).
- **VPS:** o `.env` foi reescrito só com o `DATABASE_URL` do banco `logfarma`, sem as variáveis `POSTGRES_*` (sobras do banco próprio) e sem as `LOGFARMA_DB_*`. O `compose.override.yaml` agora só põe o backend na rede `postgres` e deixa a porta 8090 local.
- **Senhas trocadas:** senha do usuário `logfarma` no Postgres e `JWT_SECRET`, geradas na própria VPS (`openssl rand -hex`) e nunca exibidas. Quem estava logado precisa entrar de novo. `DEMO_PASSWORD` ficou igual: só vale para quem roda o seed da demonstração, e o banco de produção não tem as contas `@demo.logfarma`.
- **Backups:** os arquivos antigos ficaram na VPS como `.env.bak-20261104-165231`, `compose.yaml.bak-…` e `compose.override.yaml.bak-…` (permissão só do root). A senha antiga do banco e o JWT antigo guardados ali já não valem.
- **Conferido:** containers saudáveis, `/api/health` ok de dentro e de fora (HTTPS), `GET /api/pharmacies` lendo do banco, login respondendo pelo banco ("E-mail ou senha incorretos." para conta inexistente) e nenhum erro de conexão no log.

## Pendências

- O nginx do frontend guarda o endereço do backend; se um deploy recriar só o backend, o site dá 502 até reiniciar o frontend (`docker compose restart frontend`). Correção: resolver o endereço a cada pedido no `nginx.conf`.
- O Postgres da VPS está aberto para a internet na porta 5432.

## Histórico de alterações

| Data       | O que mudou                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| 2026-11-04 | Versão inicial                                                                                        |
| 2026-11-04 | Computador com menu e folha, Entrar com paciente/equipe, Início útil, histórico de buscas da paciente |
| 2026-11-04 | Deploy com um só `DATABASE_URL`; senha do banco `logfarma` e `JWT_SECRET` trocadas na VPS             |
