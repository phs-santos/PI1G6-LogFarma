# Apresentação do PI no próprio site

- **Implementado em:** 2026-11-19
- **Última alteração:** —
- **Requisitos:** —

## Em poucas palavras

Em vez de levar a apresentação num pen drive, ela agora mora dentro do próprio site, como mais uma página: quem tiver o endereço abre no navegador e passa os slides com as setas. É como deixar o cartaz da feira pendurado na própria barraca.

## O que

- Apresentação de 23 slides em `logfarma.codexolimpo.com.br/apresentacao`: a história da Dona Maria (para o público se colocar no lugar da paciente), problema, público, solução, perfis, fluxo, requisitos, prints das telas de cada perfil, arquitetura, banco de dados (mapa das 25 tabelas e as ligações de pessoas, estoque e pedido), situações do pedido, regras de negócio, segurança e LGPD, números do projeto, roteiro da demonstração e próximos passos.
- Uma página HTML única, sem dependências além da fonte Atkinson Hyperlegible (Google Fonts). Os slides têm 1920×1080 e se ajustam a qualquer tela.
- Comandos: **← →**, espaço ou clique para passar; **F** para tela cheia; **N** para as notas do apresentador; no celular, deslizar. O endereço guarda o slide (`/apresentacao/#7` abre no fluxo).
- **Modo telão:** `/apresentacao/?auto=15` passa sozinho a cada 15 s (o número é configurável) e volta ao início no fim; o cursor some. **P** pausa e retoma; as setas continuam funcionando.
- **Prints das telas** em `telas/` (WebP), tirados do sistema rodando localmente com os mesmos dados da apresentação (seed-presentation), sem tocar em produção.

## Por que

O grupo queria a apresentação num domínio próprio e guardada no repositório, sem depender de ferramenta externa.

## Onde

| Arquivo                                          | O que é                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/frontend/public/apresentacao/index.html`   | A apresentação inteira (slides, estilo e navegação)                              |
| `apps/frontend/public/apresentacao/telas/*.webp` | Prints das telas (paciente, farmácia, fornecedor, gestor, entregador)            |
| `apps/frontend/public/apresentacao/logo.svg`     | Símbolo do LogFarma (cópia de `packages/style-guide/src/brand/logo-simbolo.svg`) |

O Vite copia `public/` para o build sem mexer, e o nginx do frontend já entrega arquivos que existem antes de cair no `index.html` da SPA. Não precisou mudar nada em `infra/`.

## Escolhas feitas

| Escolha                                           | Alternativas consideradas                   | Motivo                                                                              |
| ------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Pasta `public/` do frontend                       | Subdomínio novo; página React dentro da SPA | Sobe junto com o deploy do frontend, sem mexer em Caddy/DNS nem no código das telas |
| HTML estático com um script pequeno de navegação  | Biblioteca de slides (reveal.js)            | Nenhuma dependência nova                                                            |
| Notas do apresentador na própria página (tecla N) | Notas fora do site                          | Quem apresenta tem o roteiro à mão                                                  |
| **Sem a senha das contas de demonstração**        | Senha nas notas                             | A página é pública; a senha é passada ao grupo por fora                             |
| Página pública                                    | Atrás de login                              | É material de apresentação, sem dado pessoal                                        |

## Para editar

Edite o `index.html` direto: cada slide é um `<section>` dentro de `#stage`, e as notas ficam no `<aside>` do slide. As setas dos diagramas são `<x-connector x1 y1 x2 y2>`, desenhadas como SVG pelo script no fim da página (coordenadas em px no slide de 1920×1080).

## Histórico de alterações

| Data       | Alteração |
| ---------- | --------- |
| 2026-11-19 | Criação   |
