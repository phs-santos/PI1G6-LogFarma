# infra

Docker Compose e scripts de deploy do monorepo PI1G6-LogFarma — projeto **Localização, Reposição e Entrega de Medicamentos** (PI — Fatec Taquaritinga, 2026).

| Arquivo                 | Para quê                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `compose.yaml`          | Desenvolvimento: PostgreSQL + backend + frontend com hot reload         |
| `compose.prod.yaml`     | Produção na VPS: usa as imagens publicadas no GitHub Container Registry |
| `scripts/setup-dev.sh`  | Cria o `.env` único da raiz a partir do `.env.example`                  |
| `scripts/deploy.sh`     | Sobe ou atualiza a produção na VPS (também usado pelo botão de deploy)  |
| `scripts/backup-db.sh`  | Dump do banco de produção, com cópia local em `backups/`                |
| `scripts/restore-db.sh` | Restaura um dump no banco de desenvolvimento                            |

## Desenvolvimento

Requisitos: Docker (Desktop ou Engine com Compose v2). Na **raiz do monorepo**:

```bash
./infra/scripts/setup-dev.sh   # cria o .env da raiz (opcional: sem ele valem os padrões)
pnpm docker:dev                # = docker compose --env-file .env -f infra/compose.yaml up --build
```

| Serviço            | Endereço                                                                  |
| ------------------ | ------------------------------------------------------------------------- |
| Frontend (Vite)    | http://localhost:5173                                                     |
| Backend (Fastify)  | http://localhost:3333/api/health                                          |
| PostgreSQL         | `postgres://pi:pi@localhost:5432/pi`                                      |
| Adminer (opcional) | `docker compose --profile ferramentas up adminer` → http://localhost:8080 |

O código de `apps/backend`, `apps/frontend` e `packages/style-guide` é montado nos containers. Basta salvar o arquivo para recarregar — inclusive componentes do style-guide.

Depois de mudar dependências (`package.json`), reconstrua: `docker compose up --build`.

Comandos úteis:

```bash
cd infra
docker compose logs -f backend      # logs de um serviço
docker compose down                 # para tudo (o banco continua no volume)
docker compose down -v              # para tudo e APAGA o banco local
```

## Produção

### Como funciona

1. Push na `main` que mexa em `apps/backend` ou em `apps/frontend` (ou no style-guide) → o workflow
   **Imagem (backend)** / **Imagem (frontend)** publica `ghcr.io/<dono>/<repo>/<app>:latest` e `:<sha curto do commit>`
   (hoje: `ghcr.io/phs-santos/pi1g6-logfarma/backend` e `/frontend`). Nada vai para o ar ainda.
2. Alguém roda o deploy, manualmente: **Actions → Deploy → Run workflow** (ou `./infra/scripts/deploy.sh`).
3. O script copia o `compose.prod.yaml` para `/opt/apps/grupo-pi-6` na VPS (outra pasta: `REMOTE_DIR`), baixa as imagens, sobe os containers,
   espera ficarem saudáveis e confere `/api/health`.

Para voltar uma versão (rollback), rode o deploy informando o sha curto do commit anterior em `backend_tag` / `frontend_tag`.

Na VPS só o frontend (nginx) fica exposto, na porta `HTTP_PORT`. O nginx repassa `/api/` para o backend. O banco não tem porta pública.

**Banco:** o backend usa só o `DATABASE_URL` do `.env`. O padrão é apontar para um Postgres que já existe no servidor (o container do backend precisa estar na mesma rede Docker dele; na VPS do grupo isso fica num `compose.override.yaml` ao lado do `compose.yaml`). Para usar o Postgres próprio deste compose, ligue `COMPOSE_PROFILES=banco-proprio` e aponte `DATABASE_URL` para `db`. Ver `.env.prod.example`.

**HTTPS:** com um proxy no mesmo servidor (Caddy, nginx), use `HTTP_HOST=127.0.0.1` para a porta do site ficar só local, e `COOKIE_SECURE=true`.

### Preparar a VPS (uma vez)

1. Instale Docker Engine + plugin Compose e crie um usuário de deploy no grupo `docker`:
    ```bash
    curl -fsSL https://get.docker.com | sh
    sudo adduser --disabled-password deploy && sudo usermod -aG docker deploy
    ```
2. Gere uma chave só para o deploy e autorize na VPS:
    ```bash
    ssh-keygen -t ed25519 -N "" -C deploy-pi -f deploy_pi
    ssh-copy-id -i deploy_pi.pub deploy@SEU_IP
    ```
3. Crie o `.env` de produção na VPS:
    ```bash
    ssh root@SEU_IP 'mkdir -p /opt/apps/grupo-pi-6 && chown deploy: /opt/apps/grupo-pi-6'
    scp infra/.env.prod.example deploy@SEU_IP:/opt/apps/grupo-pi-6/.env
    ssh deploy@SEU_IP 'chmod 600 /opt/apps/grupo-pi-6/.env && nano /opt/apps/grupo-pi-6/.env'   # preencha DATABASE_URL, PUBLIC_URL, JWT_SECRET e confira o IMAGE_PREFIX
    ```

### Configurar o GitHub (uma vez)

1. **Secrets do environment `producao`** no repositório do monorepo (Settings → Environments → producao):
   `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (conteúdo de `deploy_pi`, a chave privada) e, se não for 22, `VPS_PORT`.
    ```bash
    gh secret set VPS_HOST -R phs-santos/PI1G6-LogFarma -e producao
    gh secret set VPS_USER -R phs-santos/PI1G6-LogFarma -e producao
    gh secret set VPS_SSH_KEY -R phs-santos/PI1G6-LogFarma -e producao < deploy_pi
    ```
2. **Acesso às imagens.** Como as imagens são publicadas por este mesmo repositório, o workflow de deploy já tem acesso — não precisa liberar nada.
   O secret `STYLE_GUIDE_DEPLOY_KEY` dos repositórios antigos não é mais usado.

### Deploy pelo terminal

```bash
VPS_HOST=SEU_IP VPS_USER=deploy \
REGISTRY_USER=seu-usuario REGISTRY_TOKEN=token-com-read:packages \
./infra/scripts/deploy.sh
```

Se a VPS já estiver logada no `ghcr.io`, `REGISTRY_USER`/`REGISTRY_TOKEN` podem ficar de fora.

### Backup

```bash
VPS_HOST=SEU_IP VPS_USER=deploy ./scripts/backup-db.sh                  # dump + cópia em backups/
./scripts/restore-db.sh backups/db-AAAAMMDD-HHMMSS.sql.gz              # carrega no banco local
```

Dumps de produção podem ter dados pessoais de pacientes (LGPD): `infra/backups/` está no `.gitignore`. Não compartilhe esses arquivos.

## Banco e dados da demonstração

- **Migrações** rodam sozinhas quando o backend inicia (as migrações SQL vão dentro da imagem). Não há passo manual no deploy.
- **Variáveis do `.env` da VPS** (ver `.env.prod.example`): `DATABASE_URL` e `JWT_SECRET` (obrigatórias; gere o segredo com `openssl rand -hex 32`), `PUBLIC_URL`, `HTTP_HOST`/`HTTP_PORT`, `COOKIE_SECURE`, `ALLOW_DEMO_SEED`, `DEMO_PASSWORD`.
- **Catálogo (unidades e medicamentos):** `docker compose exec backend node dist/db/seed-catalog.js` só acrescenta e pode rodar em produção.
- **Recarregar os dados da demonstração** (Taquaritinga, Dona Maria). **Apaga todos os dados do banco** — só para ensaio e apresentação:

    ```bash
    # Desenvolvimento (na raiz do monorepo)
    docker compose -f infra/compose.yaml exec backend pnpm db:seed

    # Produção (na VPS, em /opt/apps/grupo-pi-6) — feito por uma pessoa do grupo
    docker compose exec -e ALLOW_DEMO_SEED=true backend node dist/db/seed.js
    ```

    Sem `ALLOW_DEMO_SEED=true` o seed se recusa a rodar em produção. As contas criadas estão no `apps/backend/README.md`.

## Pendências

- **HTTPS**: o compose de produção serve HTTP. Para ter domínio com certificado, coloque um proxy (Caddy ou Traefik) na frente do frontend.
- **Cookie seguro**: enquanto não houver HTTPS, mantenha `COOKIE_SECURE=false`; com HTTPS, troque para `true`.
