// Carrega o catálogo (unidades de Taquaritinga, Matão e Monte Alto + medicamentos da RENAME).
// Não apaga nada, por isso pode rodar em produção:
//   pnpm db:catalog                                               (dev)
//   docker compose exec backend node dist/db/seed-catalog.js     (produção, na VPS)
import { pathToFileURL } from "node:url";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const { env } = await import("../env.js");
    const { createDb } = await import("./client.js");
    const { runMigrations } = await import("./migrate.js");
    const { seedCatalog } = await import("./catalog.js");
    const { db, pool } = createDb(env.databaseUrl);
    await runMigrations(db);
    const result = await seedCatalog(db);
    await pool.end();
    console.log(
        `Catálogo carregado: ${result.pharmaciesAdded} unidades e ${result.medicationsAdded} medicamentos novos (o que já existia ficou como estava).`,
    );
}
