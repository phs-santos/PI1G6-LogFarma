import { beforeEach, describe, expect, it } from "vitest";
import { medications, pharmacies, stockBatches, stockItems } from "../src/db/schema.js";
import { resetDb, testDb } from "./helpers.js";

async function basePharmacyAndMedication() {
    const [pharmacy] = await testDb
        .insert(pharmacies)
        .values({
            name: "UBS Centro",
            kind: "ubs",
            network: "municipal",
            address: "Rua A, 1",
            openingHours: "seg–sex 7h–17h",
            phone: "1632520000",
        })
        .returning();
    const [medication] = await testDb
        .insert(medications)
        .values({
            activeIngredient: "Losartana potássica",
            concentration: "50 mg",
            pharmaceuticalForm: "tablet",
            route: "oral",
            dispensingUnit: "comprimido",
            component: "basic",
            therapeuticClass: "anti-hipertensivo",
            prescriptionType: "simple",
            storage: "room_temperature",
            inRename: true,
            inFarmaciaPopular: true,
            searchName: "losartana potassica 50 mg",
        })
        .returning();
    return { pharmacy: pharmacy!, medication: medication! };
}

describe("esquema", () => {
    beforeEach(() => resetDb());

    it("não aceita lote com quantidade negativa", async () => {
        const { pharmacy, medication } = await basePharmacyAndMedication();
        await expect(
            testDb.insert(stockBatches).values({
                pharmacyId: pharmacy.id,
                medicationId: medication.id,
                batchNumber: "L1",
                expiryDate: "2027-01-01",
                quantity: -1,
            }),
        ).rejects.toThrow();
    });

    it("não aceita dois resumos de estoque para a mesma unidade e medicamento", async () => {
        const { pharmacy, medication } = await basePharmacyAndMedication();
        const row = { pharmacyId: pharmacy.id, medicationId: medication.id, minQuantity: 10 };
        await testDb.insert(stockItems).values(row);
        await expect(testDb.insert(stockItems).values(row)).rejects.toThrow();
    });
});
