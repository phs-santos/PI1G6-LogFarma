# style-guide

Design system do projeto **Localização, Reposição e Entrega de Medicamentos** (PI — Fatec Taquaritinga): tokens CSS + componentes React + Storybook.

## Rodando

```bash
pnpm install
pnpm storybook      # http://localhost:6006
```

## Usando no frontend

Instalado como dependência git (repo privado, precisa de chave SSH no GitHub):

```bash
pnpm add "git+ssh://git@github.com/Grupo-PI-6/style-guide.git#main"
```

```ts
import "@fatec-pi/style-guide/styles.css";
import { Button, Card } from "@fatec-pi/style-guide";
```

Para puxar a versão mais recente da `main`: `pnpm update @fatec-pi/style-guide`.
