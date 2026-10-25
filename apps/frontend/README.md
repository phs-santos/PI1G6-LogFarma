# frontend

Telas do projeto **Localização, Reposição e Entrega de Medicamentos** (PI — Fatec Taquaritinga). React 19 + Vite + TypeScript.

## Requisitos

- Node 20+
- pnpm 10 (`corepack enable`)
- Chave SSH cadastrada no GitHub com acesso à org `Grupo-PI-6` (o [style-guide](https://github.com/Grupo-PI-6/style-guide) é instalado direto do repo privado)

## Rodando

```bash
pnpm install
pnpm dev            # http://localhost:5173
```

Em dev, `/api/*` é redirecionado para o [backend](https://github.com/Grupo-PI-6/backend) em `localhost:3333` — suba ele também.

Atualizar o style-guide para a última versão da `main`: `pnpm update @fatec-pi/style-guide`.
