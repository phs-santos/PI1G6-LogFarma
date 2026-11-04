import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import {
    caregiverJoana,
    cena1Availability,
    patientProfile,
    requestView,
    usablePrescription,
} from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

function api(over: Parameters<typeof mockApi>[0] = {}) {
    return mockApi({
        "GET /api/medications/med-los/availability": { body: cena1Availability() },
        "GET /api/me": { body: { profile: patientProfile() } },
        "GET /api/me/prescriptions": { body: { items: [usablePrescription] } },
        "GET /api/me/caregivers": { body: { items: [caregiverJoana] } },
        "POST /api/requests": {
            status: 201,
            body: { request: requestView({ status: "requested" }) },
        },
        ...over,
    });
}

describe("Confirmar pedido", () => {
    it("Confirmar pedido com receita usável envia prescriptionId", async () => {
        const mock = api();
        const { router, container } = renderApp({
            route: "/pedido/novo?medicationId=med-los&fulfillment=delivery",
            session: sessions.maria,
        });
        expect(
            await screen.findByRole("heading", { level: 1, name: "Confirmar pedido" }),
        ).toBeInTheDocument();
        expect(await screen.findByRole("radio", { name: /Dra\. Helena Prado/ })).toBeChecked();
        expect(screen.getByRole("radio", { name: "Receber em casa" })).toBeChecked();
        expect(
            await screen.findByText("Rua Sete de Setembro, 50 — Centro, Taquaritinga/SP"),
        ).toBeInTheDocument();
        expect(screen.getByText("Joana da Silva (filha)")).toBeInTheDocument();
        await expectNoAxeViolations(container);

        await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar pedido" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/pedidos/req-1"));
        expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
            medicationId: "med-los",
            quantity: 30,
            fulfillment: "delivery",
            prescriptionId: "rx-1",
        });
    });

    it('Confirmar pedido desabilita o botão com "Enviando…" e envia uma vez só em duplo clique', async () => {
        let release: () => void = () => undefined;
        const mock = api({
            "POST /api/requests": () =>
                new Promise((resolve) => {
                    release = () => resolve({ status: 201, body: { request: requestView() } });
                }),
        });
        renderApp({
            route: "/pedido/novo?medicationId=med-los&fulfillment=delivery",
            session: sessions.maria,
        });
        const button = await screen.findByRole("button", { name: "Confirmar pedido" });
        await screen.findByRole("radio", { name: /Dra\. Helena Prado/ });
        await userEvent.setup().dblClick(button);
        expect(await screen.findByRole("button", { name: "Enviando…" })).toBeDisabled();
        release();
        await waitFor(() => expect(mock.calls.filter((c) => c.method === "POST")).toHaveLength(1));
    });

    it("waitlist=1 pergunta como receber e pré-marca entrega para mobilidade reduzida", async () => {
        api({ "GET /api/me": { body: { profile: patientProfile({ mobilityLimited: true }) } } });
        renderApp({
            route: "/pedido/novo?medicationId=med-los&waitlist=1",
            session: sessions.maria,
        });
        const group = await screen.findByRole("radiogroup", {
            name: "Quando chegar, como você quer receber?",
        });
        expect(group).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getByRole("radio", { name: "Receber em casa" })).toBeChecked(),
        );
        expect(screen.getByRole("radio", { name: "Buscar na farmácia" })).not.toBeChecked();
    });

    it("nova receita envia os dados de quem receitou", async () => {
        const mock = api({ "GET /api/me/prescriptions": { body: { items: [] } } });
        renderApp({
            route: "/pedido/novo?medicationId=med-los&fulfillment=delivery",
            session: sessions.maria,
        });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("radio", { name: "Informar uma receita nova" }));
        await user.type(screen.getByLabelText("Data da receita"), "2026-11-01");
        await user.type(screen.getByLabelText("Nome de quem receitou"), "Dr. Paulo Lima");
        await user.type(screen.getByLabelText("Número do conselho"), "123456");
        await user.click(screen.getByRole("checkbox", { name: /uso contínuo/ }));
        await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));
        await waitFor(() => expect(mock.calls.some((c) => c.method === "POST")).toBe(true));
        expect(mock.calls.find((c) => c.method === "POST")?.body).toMatchObject({
            prescription: {
                issuedAt: "2026-11-01",
                prescriberName: "Dr. Paulo Lima",
                prescriberCouncil: "CRM",
                prescriberNumber: "123456",
                prescriberState: "SP",
                continuousUse: true,
            },
        });
    });
});
