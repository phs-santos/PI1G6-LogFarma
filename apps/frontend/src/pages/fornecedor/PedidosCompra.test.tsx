import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, supplierSession } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import type { PurchaseOrderView } from "../../api/types";
import { expectNoAxeViolations } from "../../../test/setup";

const order: PurchaseOrderView = {
    id: "po-1",
    status: "placed",
    origin: "manual",
    medication: "Adalimumabe 40 mg/0,8 mL solução injetável",
    quantity: 3,
    pharmacy: { id: "ph-esp", name: "Farmácia de Medicamentos Especializados", address: "" },
    supplier: { id: "s1", name: "Distribuidora Farma Paulista" },
    expectedAt: null,
    invoiceNumber: null,
    shippedBatchNumber: null,
    shippedExpiryDate: null,
    shippedQuantity: null,
    waitingPatients: 3,
    createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
};

function iso(daysFromToday: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function api() {
    return mockApi({
        "GET /api/supplier/purchase-orders": { body: { items: [order] } },
        "POST /api/supplier/purchase-orders/po-1/actions": { body: { purchaseOrder: order } },
    });
}

describe("Fornecedor", () => {
    it("Confirmar prazo envia a data escolhida", async () => {
        const mock = api();
        const { container } = renderApp({ route: "/fornecedor", session: supplierSession });
        const table = await screen.findByRole("table", { name: "Pedidos de compra" });
        expect(within(table).getByText("3 pacientes esperando")).toBeInTheDocument();
        expect(within(table).getByText("Pedido há 5 dias")).toBeInTheDocument();
        await expectNoAxeViolations(container);
        const user = userEvent.setup();
        await user.click(within(table).getByRole("button", { name: "Confirmar prazo" }));
        const date = iso(8);
        await user.type(screen.getByLabelText("Data prevista de entrega"), date);
        await user.click(screen.getByRole("button", { name: "Confirmar data" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
                action: "confirm",
                expectedAt: date,
            }),
        );
    });

    it("Enviar exige nota, lote, validade futura e quantidade", async () => {
        const mock = api();
        renderApp({ route: "/fornecedor", session: supplierSession });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Enviar" }));
        expect(screen.getByLabelText("Quantidade enviada")).toHaveValue("3");
        await user.clear(screen.getByLabelText("Quantidade enviada"));
        await user.click(screen.getByRole("button", { name: "Confirmar envio" }));
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Preencha nota fiscal, lote, validade e quantidade.",
        );
        await user.type(screen.getByLabelText("Nota fiscal"), "NF 4521");
        await user.type(screen.getByLabelText("Lote"), "ADA-9001");
        await user.type(screen.getByLabelText("Validade"), iso(-1));
        await user.type(screen.getByLabelText("Quantidade enviada"), "3");
        await user.click(screen.getByRole("button", { name: "Confirmar envio" }));
        expect(screen.getByRole("alert")).toHaveTextContent(
            "A validade precisa ser uma data futura.",
        );
        expect(mock.calls.some((c) => c.method === "POST")).toBe(false);
        await user.clear(screen.getByLabelText("Validade"));
        await user.type(screen.getByLabelText("Validade"), iso(300));
        await user.click(screen.getByRole("button", { name: "Confirmar envio" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
                action: "ship",
                invoiceNumber: "NF 4521",
                batchNumber: "ADA-9001",
                expiryDate: iso(300),
                quantity: 3,
            }),
        );
    });
});
