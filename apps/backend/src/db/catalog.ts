import { and, eq, sql } from "drizzle-orm";
import type { DbOrTx } from "./client.js";
import { medications, pharmacies } from "./schema.js";
import { CATALOG_MEDICATIONS, CATALOG_PHARMACIES } from "./catalog-data.js";
import { createMedication } from "../services/medications.js";

export interface CatalogResult {
    pharmaciesAdded: number;
    medicationsAdded: number;
}

/**
 * Carrega as unidades e os medicamentos do catálogo. Só acrescenta o que falta (unidade pelo
 * nome; medicamento por princípio ativo + concentração + forma) e nunca apaga nada: pode rodar
 * em produção quantas vezes for preciso.
 */
export async function seedCatalog(db: DbOrTx): Promise<CatalogResult> {
    let pharmaciesAdded = 0;
    let medicationsAdded = 0;
    for (const p of CATALOG_PHARMACIES) {
        const [found] = await db
            .select({ id: pharmacies.id })
            .from(pharmacies)
            .where(sql`lower(${pharmacies.name}) = lower(${p.name})`);
        if (found) continue;
        await db.insert(pharmacies).values(p);
        pharmaciesAdded++;
    }
    for (const m of CATALOG_MEDICATIONS) {
        const [found] = await db
            .select({ id: medications.id })
            .from(medications)
            .where(
                and(
                    sql`lower(${medications.activeIngredient}) = lower(${m.activeIngredient})`,
                    sql`lower(${medications.concentration}) = lower(${m.concentration})`,
                    eq(medications.pharmaceuticalForm, m.pharmaceuticalForm),
                ),
            );
        if (found) continue;
        await createMedication(db, m);
        medicationsAdded++;
    }
    return { pharmaciesAdded, medicationsAdded };
}
