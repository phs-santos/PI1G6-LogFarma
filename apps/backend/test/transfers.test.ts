import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import {
    medicationRequests,
    notifications,
    stockBatches,
    stockReservations,
    transfers,
} from "../src/db/schema.js";
import {
    buildTestApp,
    createBatch,
    createMedication,
    createPatient,
    createPharmacy,
    createRequestRow,
    createStaff,
    loginAs,
    pharmacyAction,
    resetDb,
    testDb,
} from "./helpers.js";

async function twoUnits() {
    const centro = await createPharmacy({ name: "UBS Centro" });
    const jardim = await createPharmacy({
        name: "UBS Jardim São Sebastião",
        latitude: -21.415,
        longitude: -48.5,
    });
    const med = await createMedication();
    const origemLote = await createBatch({
        pharmacyId: jardim.id,
        medicationId: med.id,
        batchNumber: "J1",
        expiryDate: "2027-05-31",
        quantity: 40,
    });
    const maria = await createPatient(centro.id, { email: "maria@example.com" });
    const fCentro = await createStaff(centro.id, "pharmacist", "centro@example.com");
    const fJardim = await createStaff(jardim.id, "pharmacist", "jardim@example.com");
    const request = await createRequestRow({
        patientId: maria.id,
        medicationId: med.id,
        pharmacyId: centro.id,
        quantity: 30,
        fulfillment: "delivery",
    });
    return { centro, jardim, med, origemLote, maria, fCentro, fJardim, request };
}

function transferAction(
    app: ReturnType<typeof buildTestApp>,
    cookie: string,
    id: string,
    payload: Record<string, unknown>,
) {
    return app.inject({
        method: "POST",
        url: `/api/pharmacy/transfers/${id}/actions`,
        headers: { cookie },
        payload,
    });
}

describe("transferência entre unidades", () => {
    beforeEach(() => resetDb());

    it("fluxo completo: request_transfer → ship (origem) → receive (destino)", async () => {
        const app = buildTestApp();
        const { centro, jardim, origemLote, fCentro, fJardim, request, maria, med } =
            await twoUnits();
        const cc = await loginAs(app, fCentro.email);
        const jc = await loginAs(app, fJardim.email);

        const asked = await pharmacyAction(app, cc, request.id, {
            action: "request_transfer",
            fromPharmacyId: jardim.id,
        });
        expect(asked.statusCode).toBe(200);
        expect(asked.json().request).toMatchObject({
            status: "in_transfer",
            sourcePharmacy: { id: jardim.id },
        });

        const outgoing = await app.inject({
            method: "GET",
            url: "/api/pharmacy/transfers?direction=outgoing",
            headers: { cookie: jc },
        });
        expect(outgoing.json().items).toHaveLength(1);
        const transferId = outgoing.json().items[0].id as string;
        const avisoJardim = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, fJardim.id));
        expect(avisoJardim).toHaveLength(1);

        const shipped = await transferAction(app, jc, transferId, { action: "ship" });
        expect(shipped.statusCode).toBe(200);
        const [origem] = await testDb
            .select()
            .from(stockBatches)
            .where(eq(stockBatches.id, origemLote.id));
        expect(origem!.quantity).toBe(10);

        const received = await transferAction(app, cc, transferId, { action: "receive" });
        expect(received.statusCode).toBe(200);
        const [req] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, request.id));
        expect(req!.status).toBe("arrived");
        const [destino] = await testDb
            .select()
            .from(stockBatches)
            .where(
                and(eq(stockBatches.pharmacyId, centro.id), eq(stockBatches.medicationId, med.id)),
            );
        expect(destino).toMatchObject({
            batchNumber: "J1",
            expiryDate: "2027-05-31",
            quantity: 30,
        });
        const reservas = await testDb.select().from(stockReservations);
        expect(reservas).toMatchObject([
            { batchId: destino!.id, requestId: request.id, quantity: 30 },
        ]);
        const avisoMaria = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, maria.id));
        expect(avisoMaria.some((n) => n.body.includes("chegou"))).toBe(true);
    });

    it("destino não pode fazer ship (403) e origem não pode fazer receive (403)", async () => {
        const app = buildTestApp();
        const { jardim, fCentro, fJardim, request } = await twoUnits();
        const cc = await loginAs(app, fCentro.email);
        const jc = await loginAs(app, fJardim.email);
        await pharmacyAction(app, cc, request.id, {
            action: "request_transfer",
            fromPharmacyId: jardim.id,
        });
        const [t] = await testDb.select().from(transfers);
        expect((await transferAction(app, cc, t!.id, { action: "ship" })).statusCode).toBe(403);
        await transferAction(app, jc, t!.id, { action: "ship" });
        expect((await transferAction(app, jc, t!.id, { action: "receive" })).statusCode).toBe(403);
    });

    it("refuse libera a reserva e devolve o pedido para requested", async () => {
        const app = buildTestApp();
        const { jardim, fCentro, fJardim, request, maria } = await twoUnits();
        const cc = await loginAs(app, fCentro.email);
        const jc = await loginAs(app, fJardim.email);
        await pharmacyAction(app, cc, request.id, {
            action: "request_transfer",
            fromPharmacyId: jardim.id,
        });
        const [t] = await testDb.select().from(transfers);
        const res = await transferAction(app, jc, t!.id, {
            action: "refuse",
            reason: "Estoque reservado para campanha",
        });
        expect(res.statusCode).toBe(200);
        expect(await testDb.select().from(stockReservations)).toHaveLength(0);
        const [req] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, request.id));
        expect(req).toMatchObject({ status: "requested", sourcePharmacyId: null });
        const [refused] = await testDb.select().from(transfers);
        expect(refused).toMatchObject({
            status: "refused",
            refusalReason: "Estoque reservado para campanha",
        });
        const avisoMaria = await testDb
            .select()
            .from(notifications)
            .where(eq(notifications.userId, maria.id));
        expect(avisoMaria.some((n) => n.body.includes("não pôde enviar"))).toBe(true);
    });

    it("transferência a partir de farmácia PFPB responde 409", async () => {
        const app = buildTestApp();
        const { fCentro, request } = await twoUnits();
        const pfpb = await createPharmacy({
            name: "Drogaria Popular",
            kind: "pfpb",
            network: "pfpb",
        });
        const cc = await loginAs(app, fCentro.email);
        const res = await pharmacyAction(app, cc, request.id, {
            action: "request_transfer",
            fromPharmacyId: pfpb.id,
        });
        expect(res.statusCode).toBe(409);
        expect(res.json().message).toContain("rede pública");
    });

    it("origem sem estoque suficiente responde 409 e não muda o pedido", async () => {
        const app = buildTestApp();
        const { jardim, fCentro, med, maria, centro } = await twoUnits();
        const grande = await createRequestRow({
            patientId: maria.id,
            medicationId: med.id,
            pharmacyId: centro.id,
            quantity: 90,
        });
        const cc = await loginAs(app, fCentro.email);
        const res = await pharmacyAction(app, cc, grande.id, {
            action: "request_transfer",
            fromPharmacyId: jardim.id,
        });
        expect(res.statusCode).toBe(409);
        expect(res.json().message).toContain("Estoque insuficiente");
        const [req] = await testDb
            .select()
            .from(medicationRequests)
            .where(eq(medicationRequests.id, grande.id));
        expect(req!.status).toBe("requested");
    });
});
