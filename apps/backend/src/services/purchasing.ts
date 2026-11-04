// Pedido de compra ao fornecedor e lista de espera (RF04, RF06). Completado na Task 10.
import type { DbOrTx } from "../db/client.js";

/** Liga ao pedido de compra as entradas da fila sem pedido do mesmo par unidade+remédio. */
export async function attachWaitingEntries(_tx: DbOrTx, _purchaseOrderId: string): Promise<void> {
    // Implementado na Task 10.
}
