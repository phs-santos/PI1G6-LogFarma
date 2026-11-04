import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// Roda no pacote do backend, que já tem o driver do Postgres (o frontend não depende dele).
const CREATE_IF_MISSING = `
const pg = require("pg");
const url = new URL(process.env.E2E_DATABASE_URL);
const name = url.pathname.slice(1);
url.pathname = "/postgres";
const client = new pg.Client({ connectionString: url.toString() });
(async () => {
    await client.connect();
    const found = await client.query("select 1 from pg_database where datname = $1", [name]);
    if (found.rowCount === 0) await client.query('create database "' + name + '"');
    await client.end();
})().catch((err) => { console.error(err.message); process.exit(1); });
`;

/**
 * Cria o banco do e2e se faltar (as migrações rodam ao subir o backend e no seed).
 * Chamado ao carregar a configuração: o Playwright sobe os servidores antes do globalSetup.
 */
export function ensureDatabase(E2E_DATABASE_URL: string): void {
    execFileSync(
        "pnpm",
        ["--filter", "@fatec-pi/backend", "exec", "node", "-e", CREATE_IF_MISSING],
        {
            cwd: resolve(import.meta.dirname, "../../.."),
            stdio: "inherit",
            env: { ...process.env, E2E_DATABASE_URL },
        },
    );
}
