# Apresentação do PI no próprio site

- **Implementado em:** 2026-11-19
- **Última alteração:** 2026-11-19
- **Requisitos:** —

## Em poucas palavras

Em vez de levar a apresentação num pen drive, ela agora mora dentro do próprio site, como mais uma página: quem tiver o endereço abre no navegador e passa os slides com as setas. É como deixar o cartaz da feira pendurado na própria barraca.

## O que

- **Versão feira (padrão), 15 slides** em `logfarma.codexolimpo.com.br/apresentacao`, para o público que passa: Dona Maria, problema (CNM 2022), para quem é, solução, o que já existe e o que fazemos a mais, perfis, fluxo, prints das telas, o final da Dona Maria, próximos passos, referências e QR code para o sistema.
- **Versão completa, 26 slides**, em `/apresentacao/?completa`: inclui os técnicos (requisitos, arquitetura, banco de dados e ligações, situações do pedido, regras, segurança e LGPD, números do projeto e roteiro da demonstração), para perguntas da banca.
- Uma página HTML única, sem dependências além da fonte Atkinson Hyperlegible (Google Fonts). Os slides têm 1920×1080 e se ajustam a qualquer tela.
- Comandos: **← →**, espaço ou clique para passar; **F** para tela cheia; **N** para as notas do apresentador; no celular, deslizar. O endereço guarda o slide (`/apresentacao/#8` abre no fluxo).
- **Animações:** troca suave entre slides; nos slides de história (Dona Maria e fluxo) cada parte entra no ritmo da fala, com as setas junto das caixas; o 82% conta até o valor. Quem usa “reduzir movimento” no sistema vê tudo parado.
- **Modo telão:** `/apresentacao/?auto=15` passa sozinho a cada 15 s (o número é configurável; slides com mais texto ficam proporcionalmente mais tempo) e volta ao início no fim; o cursor some. **P** pausa e retoma; as setas continuam funcionando.
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

| Data       | Alteração                                                                                                                                                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-19 | Criação                                                                                                                                                                                                                                       |
| 2026-11-19 | Versão feira (15 slides) e completa (`?completa`); final da Dona Maria, comparação com o que já existe, referências, QR code e animações. Dado da CNM datado (2022) e nota do Aqui Tem Remédio atualizada (1,3) conforme a validação do grupo |
