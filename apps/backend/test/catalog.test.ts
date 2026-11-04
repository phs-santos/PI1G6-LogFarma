// Catálogo de produção: unidades das três cidades e medicamentos da RENAME, sem apagar nada.
import { beforeEach, describe, expect, it } from "vitest";
import { medications, pharmacies } from "../src/db/schema.js";
import { CATALOG_MEDICATIONS, CATALOG_PHARMACIES } from "../src/db/catalog-data.js";
import { seedCatalog } from "../src/db/catalog.js";
import { createMedication, resetDb, testDb } from "./helpers.js";

const key = (m: { activeIngredient: string; concentration: string; pharmaceuticalForm: string }) =>
    `${m.activeIngredient.toLowerCase()}|${m.concentration.toLowerCase()}|${m.pharmaceuticalForm}`;

describe("dados do catálogo", () => {
    it("é grande e sem repetidos", () => {
        expect(CATALOG_MEDICATIONS.length).toBeGreaterThanOrEqual(200);
        expect(new Set(CATALOG_MEDICATIONS.map(key)).size).toBe(CATALOG_MEDICATIONS.length);
        expect(new Set(CATALOG_PHARMACIES.map((p) => p.name)).size).toBe(CATALOG_PHARMACIES.length);
    });

    it("cobre Taquaritinga, Matão e Monte Alto com UBS e farmácia municipal", () => {
        for (const city of ["Taquaritinga", "Matão", "Monte Alto"]) {
            const units = CATALOG_PHARMACIES.filter((p) => p.address.endsWith(`${city}/SP`));
            expect(
                units.some((p) => p.kind === "ubs"),
                city,
            ).toBe(true);
            expect(
                units.some((p) => p.kind === "municipal_pharmacy"),
                city,
            ).toBe(true);
        }
    });

    it("classifica receita e conservação", () => {
        const find = (ing: string) => CATALOG_MEDICATIONS.find((m) => m.activeIngredient === ing)!;
        expect(find("Amoxicilina").prescriptionType).toBe("antimicrobial");
        expect(find("Clonazepam").prescriptionType).toBe("special_control");
        expect(find("Paracetamol").prescriptionType).toBe("none");
        expect(find("Insulina humana NPH").storage).toBe("refrigerated");
        expect(find("Adalimumabe").component).toBe("specialized");
        expect(find("Losartana potássica").inFarmaciaPopular).toBe(true);
    });
});

describe("seedCatalog", () => {
    beforeEach(() => resetDb());

    it("carrega tudo, não duplica na segunda vez e não apaga o que já existe", async () => {
        const existing = await createMedication({
            activeIngredient: "Remédio já cadastrado",
            concentration: "1 mg",
        });
        const first = await seedCatalog(testDb);
        expect(first.pharmaciesAdded).toBe(CATALOG_PHARMACIES.length);
        expect(first.medicationsAdded).toBe(CATALOG_MEDICATIONS.length);
        const second = await seedCatalog(testDb);
        expect(second).toEqual({ pharmaciesAdded: 0, medicationsAdded: 0 });
        const meds = await testDb.select().from(medications);
        expect(meds).toHaveLength(CATALOG_MEDICATIONS.length + 1);
        expect(meds.some((m) => m.id === existing.id)).toBe(true);
        expect(await testDb.select().from(pharmacies)).toHaveLength(CATALOG_PHARMACIES.length);
    });

    it("grava o nome de busca sem acento (a busca da paciente acha)", async () => {
        await seedCatalog(testDb);
        const [row] = (await testDb.select().from(medications)).filter(
            (m) => m.activeIngredient === "Losartana potássica",
        );
        expect(row!.searchName).toBe("losartana potassica 50 mg");
    });
});
