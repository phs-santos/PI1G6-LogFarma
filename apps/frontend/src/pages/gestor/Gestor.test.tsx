import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { managerSession, renderApp } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { losartana, pharmacies } from "../../../test/fixtures";
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
        "GET /api/manager/users": {
            body: {
                items: [
                    {
                        id: "u-gestor",
                        role: "manager",
                        email: "gestor@rede.test",
                        active: true,
                        createdAt: "2026-11-01T00:00:00.000Z",
                        name: "Gestão da rede",
                        place: null,
                        occupation: null,
                    },
                    {
                        id: "u-ana",
                        role: "pharmacy_staff",
                        email: "ana@ubs.test",
                        active: true,
                        createdAt: "2026-11-01T00:00:00.000Z",
                        name: "Ana Beatriz Rocha",
                        place: "UBS Centro",
                        occupation: "pharmacist",
                    },
                ],
            },
        },
        "PATCH /api/manager/users/u-ana": { body: { ok: true } },
        "GET /api/manager/medications": {
            body: { items: [losartana], total: 1, page: 1, pageSize: 25 },
        },
        "GET /api/medications/med-los": {
            body: {
                medication: {
                    id: "med-los",
                    activeIngredient: "Losartana potássica",
                    concentration: "50 mg",
                    pharmaceuticalForm: "tablet",
                    route: "oral",
                    dispensingUnit: "comprimido",
                    component: "basic",
                    therapeuticClass: "Anti-hipertensivo",
                    prescriptionType: "simple",
                    storage: "room_temperature",
                    inRename: true,
                    inFarmaciaPopular: true,
                    catmatCode: null,
                    createdAt: "2026-11-01T00:00:00.000Z",
                },
            },
        },
        "PATCH /api/medications/med-los": {
            body: {
                medication: {
                    id: "med-los",
                    activeIngredient: "Losartana potássica",
                    concentration: "100 mg",
                },
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

    it("Criar conta abre num diálogo e pede CRF só para farmacêutico", async () => {
        const mock = api();
        const { container } = renderApp({ route: "/gestao/usuarios", session: managerSession });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Criar conta" }));
        const dialog = screen.getByRole("dialog", { name: "Criar conta" });
        await user.selectOptions(within(dialog).getByLabelText("Perfil"), "pharmacy_staff");
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
        await user.click(within(dialog).getByRole("button", { name: "Criar conta" }));
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
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("o endereço antigo /gestao/contas leva à lista de usuários", async () => {
        api();
        const { router } = renderApp({ route: "/gestao/contas", session: managerSession });
        await waitFor(() => expect(router.state.location.pathname).toBe("/gestao/usuarios"));
    });

    it("Usuários lista a equipe e desativa com confirmação", async () => {
        const mock = api();
        const { container } = renderApp({ route: "/gestao/usuarios", session: managerSession });
        const table = await screen.findByRole("table", { name: "Contas da equipe" });
        expect(within(table).getByText("Ana Beatriz Rocha")).toBeInTheDocument();
        expect(within(table).getByText("Você")).toBeInTheDocument();
        await expectNoAxeViolations(container);
        const user = userEvent.setup();
        await user.click(
            within(table).getByRole("button", { name: "Desativar Ana Beatriz Rocha" }),
        );
        const dialog = screen.getByRole("dialog", {
            name: "Desativar a conta de Ana Beatriz Rocha?",
        });
        await user.click(within(dialog).getByRole("button", { name: "Sim, desativar" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "PATCH")).toMatchObject({
                path: "/api/manager/users/u-ana",
                body: { active: false },
            }),
        );
    });

    it("Medicamentos lista o catálogo e edita num diálogo", async () => {
        const mock = api();
        const { container } = renderApp({ route: "/gestao/medicamentos", session: managerSession });
        const table = await screen.findByRole("table", { name: "Catálogo de medicamentos" });
        expect(within(table).getByText("Losartana potássica 50 mg comprimido")).toBeInTheDocument();
        await expectNoAxeViolations(container);
        const user = userEvent.setup();
        await user.click(
            within(table).getByRole("button", {
                name: "Editar Losartana potássica 50 mg comprimido",
            }),
        );
        const dialog = screen.getByRole("dialog", {
            name: "Editar Losartana potássica 50 mg comprimido",
        });
        const conc = await within(dialog).findByLabelText("Concentração");
        expect(conc).toHaveValue("50 mg");
        await user.clear(conc);
        await user.type(conc, "100 mg");
        await user.click(within(dialog).getByRole("button", { name: /Salvar/ }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "PATCH")?.body).toMatchObject({
                concentration: "100 mg",
            }),
        );
        expect(
            await screen.findByText("Losartana potássica 100 mg atualizado."),
        ).toBeInTheDocument();
    });

    it("Cadastrar medicamento abre o formulário num diálogo", async () => {
        api();
        renderApp({ route: "/gestao/medicamentos", session: managerSession });
        await userEvent
            .setup()
            .click(await screen.findByRole("button", { name: "Cadastrar medicamento" }));
        const dialog = screen.getByRole("dialog", { name: "Cadastrar medicamento" });
        expect(within(dialog).getByLabelText("Princípio ativo")).toBeInTheDocument();
    });

    it("Unidades lista endereço, telefone e horário", async () => {
        api();
        renderApp({ route: "/gestao/unidades", session: managerSession });
        const table = await screen.findByRole("table", { name: "Unidades da rede" });
        expect(within(table).getByText("UBS Centro")).toBeInTheDocument();
        expect(within(table).getByText("(16) 3252-1000")).toBeInTheDocument();
    });
});
