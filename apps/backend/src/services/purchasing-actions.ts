// Liga a ação de balcão "order_from_supplier" ao serviço de compra (evita import circular com counter.ts).
import { eq } from "drizzle-orm";
import { medications } from "../db/schema.js";
import { medicationDisplayName } from "../domain/medication-name.js";
import { registerCounterAction } from "./counter.js";
import { notifySupplierStaff } from "./notifications.js";
import { orderFromSupplier, waitlistQueue } from "./purchasing.js";
import { notifyPatient, setStatus } from "./requests.js";

registerCounterAction("order_from_supplier", async (tx, _staff, request, body) => {
    if (body.action !== "order_from_supplier") return;
    await setStatus(tx, request, "waitlisted");
    const { supplierId } = await orderFromSupplier(tx, request, body.supplierId);
    const [medication] = await tx
        .select()
        .from(medications)
        .where(eq(medications.id, request.medicationId));
    const queue = await waitlistQueue(tx, request.pharmacyId, request.medicationId);
    const position = queue.findIndex((e) => e.requestId === request.id) + 1;
    await notifyPatient(
        tx,
        request,
        "Você entrou na lista de espera",
        `O remédio está em falta na rede. Pedimos ao fornecedor e você é o ${position}º da lista. Avisaremos a previsão.`,
    );
    await notifySupplierStaff(tx, supplierId, {
        title: "Novo pedido de compra",
        body: `Pedido de ${medicationDisplayName(medication!)}.`,
    });
});
