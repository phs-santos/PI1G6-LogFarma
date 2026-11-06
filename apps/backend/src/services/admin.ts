// Gestão da rede: listas de medicamentos e de contas da equipe, e ativar/desativar contas.
// Pacientes ficam fora da lista de contas (LGPD, RNF03): o gestor não precisa dos dados deles.
import { and, asc, count, eq, ilike, ne, type SQL } from "drizzle-orm";
import type { DbOrTx } from "../db/client.js";
import {
    couriers,
    medications,
    pharmacies,
    pharmacyStaff,
    supplierStaff,
    suppliers,
    users,
} from "../db/schema.js";
import { normalizeSearch } from "../domain/text.js";
import { ForbiddenError, NotFoundError } from "../domain/errors.js";
import { toMedicationSummary, type MedicationSummary } from "./medications.js";

type Medication = typeof medications.$inferSelect;
import type { PharmacyInput, StaffAccount, StaffRole } from "../contracts.js";

export const MEDICATION_PAGE_SIZE = 25;

/** Catálogo em ordem alfabética, com busca e componente opcionais, em páginas de 25. */
export async function listMedicationsPage(
    db: DbOrTx,
    query: { search?: string; page?: number; component?: Medication["component"] },
): Promise<{ items: MedicationSummary[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, query.page ?? 1);
    const text = query.search?.trim();
    const where: SQL | undefined = and(
        text
            ? ilike(medications.searchName, `%${normalizeSearch(text).replace(/[%_\\]/g, "\\$&")}%`)
            : undefined,
        query.component ? eq(medications.component, query.component) : undefined,
    );
    const [{ total }] = (await db.select({ total: count() }).from(medications).where(where)) as [
        { total: number },
    ];
    const rows = await db
        .select()
        .from(medications)
        .where(where)
        .orderBy(asc(medications.searchName))
        .limit(MEDICATION_PAGE_SIZE)
        .offset((page - 1) * MEDICATION_PAGE_SIZE);
    return { items: rows.map(toMedicationSummary), total, page, pageSize: MEDICATION_PAGE_SIZE };
}

/** Contas da equipe (sem pacientes), com o nome e onde trabalham. */
export async function listStaffAccounts(db: DbOrTx, role?: StaffRole): Promise<StaffAccount[]> {
    const rows = await db
        .select({
            id: users.id,
            role: users.role,
            email: users.email,
            active: users.active,
            createdAt: users.createdAt,
            staffName: pharmacyStaff.fullName,
            occupation: pharmacyStaff.occupation,
            pharmacyName: pharmacies.name,
            supplierStaffName: supplierStaff.fullName,
            supplierName: suppliers.name,
            courierName: couriers.fullName,
        })
        .from(users)
        .leftJoin(pharmacyStaff, eq(pharmacyStaff.userId, users.id))
        .leftJoin(pharmacies, eq(pharmacies.id, pharmacyStaff.pharmacyId))
        .leftJoin(supplierStaff, eq(supplierStaff.userId, users.id))
        .leftJoin(suppliers, eq(suppliers.id, supplierStaff.supplierId))
        .leftJoin(couriers, eq(couriers.userId, users.id))
        .where(and(ne(users.role, "patient"), role ? eq(users.role, role) : undefined))
        .orderBy(asc(users.role), asc(users.email));
    return rows.map((r) => ({
        id: r.id,
        role: r.role as StaffRole,
        email: r.email,
        active: r.active,
        createdAt: r.createdAt.toISOString(),
        name: r.staffName ?? r.supplierStaffName ?? r.courierName ?? "Gestão da rede",
        place: r.pharmacyName ?? r.supplierName ?? null,
        occupation: r.occupation ?? null,
    }));
}

/** Ativa ou desativa uma conta da equipe. O gestor não desativa a si mesmo. */
export async function setStaffActive(
    db: DbOrTx,
    actorId: string,
    userId: string,
    active: boolean,
): Promise<void> {
    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
    if (!row || row.role === "patient") throw new NotFoundError("Conta não encontrada.");
    if (userId === actorId && !active) {
        throw new ForbiddenError("Você não pode desativar a sua própria conta.");
    }
    await db.update(users).set({ active }).where(eq(users.id, userId));
}

/** Unidade nova da rede; já aparece na lista pública de unidades. */
export async function createPharmacy(db: DbOrTx, input: PharmacyInput): Promise<{ id: string }> {
    const [row] = await db
        .insert(pharmacies)
        .values({
            name: input.name.trim(),
            kind: input.kind,
            network: input.network,
            address: input.address.trim(),
            phone: input.phone,
            openingHours: input.openingHours.trim(),
            cnes: input.cnes ?? null,
            cnpj: input.cnpj ?? null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
        })
        .returning({ id: pharmacies.id });
    return row!;
}
