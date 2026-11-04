import { eq, ilike } from "drizzle-orm";
import type { DbOrTx } from "../db/client.js";
import { medications } from "../db/schema.js";
import { medicationDisplayName } from "../domain/medication-name.js";
import { normalizeSearch } from "../domain/text.js";
import { NotFoundError } from "../domain/errors.js";

export type Medication = typeof medications.$inferSelect;
export type MedicationInput = Omit<
    typeof medications.$inferInsert,
    "id" | "searchName" | "createdAt"
>;

export interface MedicationSummary {
    id: string;
    displayName: string;
    activeIngredient: string;
    concentration: string;
    pharmaceuticalForm: Medication["pharmaceuticalForm"];
    component: Medication["component"];
    prescriptionType: Medication["prescriptionType"];
    storage: Medication["storage"];
}

export function toMedicationSummary(m: Medication): MedicationSummary {
    return {
        id: m.id,
        displayName: medicationDisplayName(m),
        activeIngredient: m.activeIngredient,
        concentration: m.concentration,
        pharmaceuticalForm: m.pharmaceuticalForm,
        component: m.component,
        prescriptionType: m.prescriptionType,
        storage: m.storage,
    };
}

function searchNameOf(m: { activeIngredient: string; concentration: string }): string {
    return normalizeSearch(`${m.activeIngredient} ${m.concentration}`);
}

export async function searchMedications(db: DbOrTx, text: string): Promise<MedicationSummary[]> {
    const pattern = `%${normalizeSearch(text).replace(/[%_\\]/g, "\\$&")}%`;
    const rows = await db
        .select()
        .from(medications)
        .where(ilike(medications.searchName, pattern))
        .limit(20);
    return rows.map(toMedicationSummary);
}

export async function getMedication(db: DbOrTx, id: string): Promise<Medication> {
    const [row] = await db.select().from(medications).where(eq(medications.id, id));
    if (!row) throw new NotFoundError("Medicamento não encontrado.");
    return row;
}

export async function createMedication(db: DbOrTx, input: MedicationInput): Promise<Medication> {
    const [row] = await db
        .insert(medications)
        .values({ ...input, searchName: searchNameOf(input) })
        .returning();
    return row!;
}

export async function updateMedication(
    db: DbOrTx,
    id: string,
    patch: Partial<MedicationInput>,
): Promise<Medication> {
    const current = await getMedication(db, id);
    const merged = { ...current, ...patch };
    const [row] = await db
        .update(medications)
        .set({ ...patch, searchName: searchNameOf(merged) })
        .where(eq(medications.id, id))
        .returning();
    return row!;
}
