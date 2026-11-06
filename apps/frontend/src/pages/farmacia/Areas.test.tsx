import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, renderWithApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { losartana, stockOf } from "../../../test/fixtures";
import type { PurchaseOrderView, TransferView } from "../../api/types";
import { MedicamentoForm } from "./MedicamentoForm";
import { expectNoAxeViolations } from "../../../test/setup";

const base = {
    "GET /api/pharmacy/requests": { body: { items: [] } },
    "GET /api/pharmacy/stock": { body: { items: [stockOf(losartana, 200)] } },
};

function transfer(over: Partial<TransferView>): TransferView {
    return {
        id: "t1",
        requestId: "req-9",
        status: "requested",
        quantity: 30,
        medication: losartana.displayName,
        batchNumber: "L-001",
        expiryDate: "2027-05-01",
        // A Vila Negri pediu à UBS Centro: sai do Centro (from) para a Vila (to).
        from: { id: "ph-centro", name: "UBS Centro" },
        to: { id: "ph-vila", name: "UBS Vila Negri" },
        refusalReason: null,
        createdAt: new Date().toISOString(),
        ...over,
    };
}

function po(over: Partial<PurchaseOrderView>): PurchaseOrderView {
    return {
        id: "po-1",
        status: "confirmed",
        origin: "manual",
        medication: losartana.displayName,
        quantity: 100,
        pharmacy: { id: "ph-centro", name: "UBS Centro", address: "" },
        supplier: { id: "s1", name: "Distribuidora Farma Paulista" },
        expectedAt: "2026-11-12",
        invoiceNumber: null,
        shippedBatchNumber: null,
        shippedExpiryDate: null,
        shippedQuantity: null,
        waitingPatients: 2,
        createdAt: new Date().toISOString(),
        ...over,
    };
}

describe("Farmácia — Transferências", () => {
    it("Recusar exige motivo antes de enviar", async () => {
        const mock = mockApi({
            ...base,
            "GET /api/pharmacy/transfers": ({ url }) => ({
                body: {
                    items: url.searchParams.get("direction") === "outgoing" ? [transfer({})] : [],
                },
            }),
            "POST /api/pharmacy/transfers/t1/actions": {
                body: { transfer: transfer({ status: "refused" }) },
            },
        });
        const { container } = renderApp({
            route: "/farmacia/transferencias",
            session: sessions.ana,
        });
        const table = await screen.findByRole("table", { name: "Pedidos para nós" });
        await expectNoAxeViolations(container);
        const user = userEvent.setup();
        await user.click(within(table).getByRole("button", { name: "Recusar" }));
        await user.click(screen.getByRole("button", { name: "Confirmar recusa" }));
        expect(screen.getByText("Escreva o motivo da recusa.")).toBeInTheDocument();
        expect(mock.calls.some((c) => c.method === "POST")).toBe(false);
        await user.type(
            screen.getByLabelText("Motivo da recusa"),
            "Estoque reservado para a campanha",
        );
        await user.click(screen.getByRole("button", { name: "Confirmar recusa" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
                action: "refuse",
                reason: "Estoque reservado para a campanha",
            }),
        );
    });
});

describe("Farmácia — Compras", () => {
    it("Dar entrada só aparece com a compra enviada", async () => {
        mockApi({
            ...base,
            "GET /api/pharmacy/transfers": { body: { items: [] } },
            "GET /api/pharmacy/purchase-orders": {
                body: {
                    items: [
                        po({}),
                        po({
                            id: "po-2",
                            status: "shipped",
                            invoiceNumber: "NF 123",
                            shippedBatchNumber: "L-777",
                            shippedExpiryDate: "2027-08-01",
                            shippedQuantity: 100,
                        }),
                    ],
                },
            },
        });
        const { container } = renderApp({ route: "/farmacia/compras", session: sessions.ana });
        const table = await screen.findByRole("table", { name: "Pedidos de compra" });
        expect(within(table).getAllByRole("button", { name: "Dar entrada" })).toHaveLength(1);
        expect(within(table).getByText("Prazo confirmado: 12/11")).toBeInTheDocument();
        expect(within(table).getByText(/L-777/)).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });
});

describe("Farmácia — Estoque", () => {
    it('Estoque marca lote vencendo com "Vence em 20 dias"', async () => {
        const d = new Date();
        d.setDate(d.getDate() + 20);
        const expiry = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const item = stockOf(losartana, 80);
        item.minQuantity = 100;
        item.batches = [
            { id: "b9", batchNumber: "L-900", expiryDate: expiry, quantity: 80, reserved: 0 },
        ];
        mockApi({
            ...base,
            "GET /api/pharmacy/stock": { body: { items: [item] } },
            "GET /api/pharmacy/transfers": { body: { items: [] } },
        });
        const { container } = renderApp({ route: "/farmacia/estoque", session: sessions.ana });
        expect(await screen.findByText("Vence em 20 dias")).toBeInTheDocument();
        const table = screen.getByRole("table", { name: "Estoque da unidade" });
        expect(within(table).getByText("Abaixo do mínimo")).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("Dar entrada em lote abre num diálogo e envia o lote", async () => {
        const mock = mockApi({
            ...base,
            "GET /api/pharmacy/stock": { body: { items: [stockOf(losartana, 80)] } },
            "GET /api/pharmacy/transfers": { body: { items: [] } },
            "POST /api/pharmacy/stock/batches": { status: 201, body: { ok: true } },
        });
        renderApp({ route: "/farmacia/estoque", session: sessions.ana });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Dar entrada em lote" }));
        const dialog = screen.getByRole("dialog", { name: "Dar entrada em lote" });
        await user.selectOptions(within(dialog).getByLabelText("Remédio"), losartana.id);
        await user.type(within(dialog).getByLabelText("Lote"), "L-1");
        await user.type(within(dialog).getByLabelText("Validade"), "2027-01-31");
        await user.type(within(dialog).getByLabelText("Quantidade"), "50");
        await user.click(within(dialog).getByRole("button", { name: "Registrar lote" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
                medicationId: losartana.id,
                batchNumber: "L-1",
                expiryDate: "2027-01-31",
                quantity: 50,
            }),
        );
        expect(await screen.findByText("Lote registrado.")).toBeInTheDocument();
    });

    it("Cadastrar medicamento abre o formulário num diálogo", async () => {
        mockApi({
            ...base,
            "GET /api/pharmacy/stock": { body: { items: [] } },
            "GET /api/pharmacy/transfers": { body: { items: [] } },
        });
        renderApp({ route: "/farmacia/estoque", session: sessions.ana });
        await userEvent
            .setup()
            .click(await screen.findByRole("button", { name: "Cadastrar medicamento" }));
        const dialog = screen.getByRole("dialog", { name: "Cadastrar medicamento" });
        expect(within(dialog).getByLabelText("Princípio ativo")).toBeInTheDocument();
    });
});

describe("MedicamentoForm", () => {
    it("MedicamentoForm envia prescriptionType e storage escolhidos", async () => {
        mockApi();
        const onSubmit = vi.fn();
        const { container } = renderWithApp(
            <MedicamentoForm onSubmit={onSubmit} pending={false} />,
            {
                session: sessions.ana,
            },
        );
        const user = userEvent.setup();
        await user.type(screen.getByLabelText("Princípio ativo"), "Insulina humana NPH");
        await user.type(screen.getByLabelText("Concentração"), "100 UI/mL");
        await user.selectOptions(screen.getByLabelText("Forma"), "injectable");
        await user.selectOptions(screen.getByLabelText("Via"), "subcutaneous");
        await user.type(screen.getByLabelText("Unidade de entrega"), "frasco");
        await user.selectOptions(screen.getByLabelText("Componente do SUS"), "strategic");
        await user.type(screen.getByLabelText("Classe terapêutica"), "Antidiabético");
        await user.selectOptions(screen.getByLabelText("Tipo de receita"), "simple");
        await user.selectOptions(screen.getByLabelText("Conservação"), "refrigerated");
        await user.click(screen.getByRole("checkbox", { name: "Está no Farmácia Popular" }));
        await expectNoAxeViolations(container);
        await user.click(screen.getByRole("button", { name: "Salvar medicamento" }));
        expect(onSubmit).toHaveBeenCalledWith({
            activeIngredient: "Insulina humana NPH",
            concentration: "100 UI/mL",
            pharmaceuticalForm: "injectable",
            route: "subcutaneous",
            dispensingUnit: "frasco",
            component: "strategic",
            therapeuticClass: "Antidiabético",
            prescriptionType: "simple",
            storage: "refrigerated",
            inRename: true,
            inFarmaciaPopular: true,
        });
    });

    it("não envia com campo obrigatório vazio", async () => {
        mockApi();
        const onSubmit = vi.fn();
        renderWithApp(<MedicamentoForm onSubmit={onSubmit} pending={false} />, {
            session: sessions.ana,
        });
        await userEvent.setup().click(screen.getByRole("button", { name: "Salvar medicamento" }));
        expect(onSubmit).not.toHaveBeenCalled();
        expect(screen.getByLabelText("Princípio ativo")).toHaveAccessibleDescription(/Obrigatório/);
    });
});
