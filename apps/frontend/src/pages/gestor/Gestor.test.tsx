import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { managerSession, renderApp } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { pharmacies } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

function api() {
    return mockApi({
        "GET /api/manager/summary": {
            body: { unmetSearches7d: 23, expiringBatches60d: 4, waitingPatients: 3 },
        },
        "GET /api/manager/unmet-demand": {
            body: {
                items: [
                    {
                        medicationId: "m1",
                        displayName: "Adalimumabe",
                        pharmacyId: "ph-esp",
                        pharmacyName: "Especializados",
                        searches: 6,
                    },
                    {
                        medicationId: "m1",
                        displayName: "Adalimumabe",
                        pharmacyId: "ph-centro",
                        pharmacyName: "UBS Centro",
                        searches: 5,
                    },
                    {
                        medicationId: "m2",
                        displayName: "Clonazepam",
                        pharmacyId: "ph-centro",
                        pharmacyName: "UBS Centro",
                        searches: 4,
                    },
                ],
            },
        },
        "GET /api/manager/expiring-stock": {
            body: {
                items: [
                    {
                        pharmacyName: "UBS Centro",
                        displayName: "Dipirona 500 mg",
                        batchNumber: "DIP-1",
                        expiryDate: "2026-12-04",
                        quantity: 80,
                    },
                ],
            },
        },
        "GET /api/pharmacies": { body: { items: pharmacies } },
        "GET /api/suppliers": {
            body: {
                items: [{ id: "s1", name: "Distribuidora Farma Paulista", cnpj: "00000000000100" }],
            },
        },
        "POST /api/manager/users": {
            status: 201,
            body: { user: { id: "u-new", role: "pharmacy_staff" } },
        },
    });
}

describe("Gestor", () => {
    it("Painel mostra os três números do resumo", async () => {
        api();
        const { container } = renderApp({ route: "/gestao", session: managerSession });
        expect(await screen.findByText("23")).toBeInTheDocument();
        expect(screen.getByText("Buscas sem estoque (7 dias)")).toBeInTheDocument();
        expect(screen.getByText("4")).toBeInTheDocument();
        expect(screen.getByText("Pacientes na fila de espera")).toBeInTheDocument();
        const table = await screen.findByRole("table", { name: "Lotes perto de vencer" });
        expect(within(table).getByText("DIP-1")).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("BarList soma as buscas por remédio", async () => {
        api();
        renderApp({ route: "/gestao", session: managerSession });
        expect(await screen.findByText("Adalimumabe: 11")).toBeInTheDocument();
        expect(screen.getByText("Clonazepam: 4")).toBeInTheDocument();
    });

    it("Contas pede CRF só para farmacêutico", async () => {
        const mock = api();
        const { container } = renderApp({ route: "/gestao/contas", session: managerSession });
        const user = userEvent.setup();
        await user.selectOptions(await screen.findByLabelText("Perfil"), "pharmacy_staff");
        await user.selectOptions(await screen.findByLabelText("Unidade"), "ph-centro");
        await user.selectOptions(screen.getByLabelText("Ocupação"), "pharmacy_assistant");
        expect(screen.queryByLabelText("Número do CRF")).not.toBeInTheDocument();
        await user.selectOptions(screen.getByLabelText("Ocupação"), "pharmacist");
        expect(screen.getByLabelText("Número do CRF")).toBeInTheDocument();
        await expectNoAxeViolations(container);
        await user.type(screen.getByLabelText("Nome completo"), "Ana Beatriz Rocha");
        await user.type(screen.getByLabelText("E-mail"), "ana@ubs.test");
        await user.type(screen.getByLabelText("Senha inicial"), "senha-inicial-1");
        await user.type(screen.getByLabelText("Número do CRF"), "12345");
        await user.click(screen.getByRole("button", { name: "Criar conta" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
                role: "pharmacy_staff",
                fullName: "Ana Beatriz Rocha",
                email: "ana@ubs.test",
                password: "senha-inicial-1",
                pharmacyId: "ph-centro",
                occupation: "pharmacist",
                crfNumber: "12345",
                crfState: "SP",
            }),
        );
        expect(await screen.findByText("Conta criada para Ana Beatriz Rocha.")).toBeInTheDocument();
    });
});
