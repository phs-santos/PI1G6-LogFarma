# infra

Docker Compose e scripts de deploy do projeto **Localização, Reposição e Entrega de Medicamentos** (PI — Fatec Taquaritinga, 2026).

| Arquivo | Para quê |
|---|---|
| `compose.yaml` | Desenvolvimento: PostgreSQL + backend + frontend com hot reload |
| `compose.prod.yaml` | Produção na VPS: usa as imagens publicadas no GitHub Container Registry |
| `scripts/setup-dev.sh` | Clona os outros repositórios ao lado deste e cria o `.env` |
| `scripts/deploy.sh` | Sobe ou atualiza a produção na VPS (também usado pelo botão de deploy) |
| `scripts/backup-db.sh` | Dump do banco de produção, com cópia local em `backups/` |
| `scripts/restore-db.sh` | Restaura um dump no banco de desenvolvimento |

## Desenvolvimento

Requisitos: Docker (Desktop ou Engine com Compose v2) e uma chave SSH cadastrada no GitHub com acesso à org `Grupo-PI-6`.

```bash
git clone git@github.com:Grupo-PI-6/infra.git
./infra/scripts/setup-dev.sh        # clona backend, frontend e style-guide ao lado
cd infra
docker compose up --build
```

A estrutura esperada é:

```
grupo-pi-6/
├── infra/
├── backend/
├── frontend/
└── style-guide/
```

| Serviço | Endereço |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Fastify) | http://localhost:3333/api/health |
| PostgreSQL | `postgres://pi:pi@localhost:5432/pi` |
| Adminer (opcional) | `docker compose --profile ferramentas up adminer` → http://localhost:8080 |

O código de `../backend` e `../frontend` é montado nos containers. Basta salvar o arquivo para recarregar.

**Chave SSH no build do frontend.** O style-guide é privado, então o `pnpm install` dentro da imagem precisa da sua chave. Ou ela está no ssh-agent (`ssh-add -l` mostra), ou você define `GITHUB_SSH_KEY=/caminho/da/chave` no `.env`.

Depois de mudar dependências (`package.json`), reconstrua: `docker compose up --build`.

Comandos úteis:

```bash
docker compose logs -f backend      # logs de um serviço
docker compose down                 # para tudo (o banco continua no volume)
docker compose down -v              # para tudo e APAGA o banco local
```

## Produção

### Como funciona

1. Push na `main` do **backend** ou do **frontend** → o workflow **Imagem** daquele repo publica
   `ghcr.io/grupo-pi-6/<repo>:latest` e `:<sha curto do commit>`. Nada vai para o ar ainda.
2. Alguém roda o deploy, manualmente: **Actions → Deploy → Run workflow** neste repo (ou `scripts/deploy.sh`).
3. O script copia o `compose.prod.yaml` para `~/grupo-pi-6` na VPS, baixa as imagens, sobe os containers,
   espera ficarem saudáveis e confere `/api/health`.

Para voltar uma versão (rollback), rode o deploy informando o sha curto do commit anterior em `backend_tag` / `frontend_tag`.

Na VPS só o frontend (nginx) fica exposto, na porta `HTTP_PORT`. O nginx repassa `/api/` para o backend. O banco não tem porta pública.

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
   ssh deploy@SEU_IP 'mkdir -p ~/grupo-pi-6'
   scp .env.prod.example deploy@SEU_IP:~/grupo-pi-6/.env
   ssh deploy@SEU_IP 'chmod 600 ~/grupo-pi-6/.env && nano ~/grupo-pi-6/.env'   # troque a senha e o PUBLIC_URL
   ```

### Configurar o GitHub (uma vez)

1. **Secrets do environment `producao`** neste repo (Settings → Environments → producao):
   `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (conteúdo de `deploy_pi`, a chave privada) e, se não for 22, `VPS_PORT`.
   ```bash
   gh secret set VPS_HOST -R Grupo-PI-6/infra -e producao
   gh secret set VPS_USER -R Grupo-PI-6/infra -e producao
   gh secret set VPS_SSH_KEY -R Grupo-PI-6/infra -e producao < deploy_pi
   ```
2. **Acesso às imagens.** Depois que cada imagem for publicada pela primeira vez, abra o pacote em
   github.com/orgs/Grupo-PI-6/packages → `backend` (e depois `frontend`) → *Package settings* →
   *Manage Actions access* → adicione o repo **infra** com permissão *Read*. Sem isso, o deploy não consegue baixar as imagens.

### Deploy pelo terminal

```bash
VPS_HOST=SEU_IP VPS_USER=deploy \
REGISTRY_USER=seu-usuario REGISTRY_TOKEN=token-com-read:packages \
./scripts/deploy.sh
```

Se a VPS já estiver logada no `ghcr.io`, `REGISTRY_USER`/`REGISTRY_TOKEN` podem ficar de fora.

### Backup

```bash
VPS_HOST=SEU_IP VPS_USER=deploy ./scripts/backup-db.sh                  # dump + cópia em backups/
./scripts/restore-db.sh backups/db-AAAAMMDD-HHMMSS.sql.gz              # carrega no banco local
```

Dumps de produção podem ter dados pessoais de pacientes (LGPD): `backups/` está no `.gitignore`. Não compartilhe esses arquivos.

## Pendências

- **HTTPS**: o compose de produção serve HTTP. Para ter domínio com certificado, coloque um proxy (Caddy ou Traefik) na frente do frontend.
- **Migrações**: o backend ainda não usa banco nem tem ORM. Quando tiver, o passo de migração entra no `deploy.sh` antes do `up`.
