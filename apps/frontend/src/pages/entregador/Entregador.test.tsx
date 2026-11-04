import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { acceptedDelivery, delivery } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Entregador", () => {
    it("Disponíveis não mostra nome nem endereço", async () => {
        mockApi({
            "GET /api/courier/deliveries": ({ url }) => ({
                body: { items: url.searchParams.get("scope") === "available" ? [delivery()] : [] },
            }),
        });
        const { container } = renderApp({ route: "/entregas", session: sessions.carlos });
        expect(await screen.findByText("Centro, Taquaritinga")).toBeInTheDocument();
        expect(screen.getByText("Retirar na UBS Centro")).toBeInTheDocument();
        expect(screen.getByText("Amanhã, 8h às 12h")).toBeInTheDocument();
        expect(screen.getByText("Refrigerado")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Aceitar entrega" })).toBeInTheDocument();
        expect(screen.queryByText(/Maria/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Losartana/)).not.toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("Aceitar em entrega já aceita mostra a mensagem da API", async () => {
        mockApi({
            "GET /api/courier/deliveries": ({ url }) => ({
                body: { items: url.searchParams.get("scope") === "available" ? [delivery()] : [] },
            }),
            "POST /api/courier/deliveries/d1/actions": {
                status: 409,
                body: { message: "Outro entregador já aceitou esta entrega." },
            },
        });
        renderApp({ route: "/entregas", session: sessions.carlos });
        await userEvent
            .setup()
            .click(await screen.findByRole("button", { name: "Aceitar entrega" }));
        expect(
            await screen.findByText("Outro entregador já aceitou esta entrega."),
        ).toBeInTheDocument();
    });

    it("Entreguei exige o nome de quem recebeu", async () => {
        const mock = mockApi({
            "GET /api/courier/deliveries": {
                body: { items: [acceptedDelivery({ status: "out_for_delivery" })] },
            },
            "POST /api/courier/deliveries/d1/actions": {
                body: { delivery: acceptedDelivery({ status: "delivered", receivedBy: "Maria" }) },
            },
        });
        const { container } = renderApp({ route: "/entregas/d1", session: sessions.carlos });
        expect(
            await screen.findByRole("heading", { level: 1, name: "Maria Aparecida da Silva" }),
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Ligar para (16) 99123-4567" })).toHaveAttribute(
            "href",
            "tel:16991234567",
        );
        expect(screen.getByText("Ao entregar, lembre: guardar na geladeira.")).toBeInTheDocument();
        await expectNoAxeViolations(container);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Entreguei" }));
        await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));
        expect(screen.getByText("Escreva o nome de quem recebeu.")).toBeInTheDocument();
        expect(mock.calls.some((c) => c.method === "POST")).toBe(false);
        await user.type(screen.getByLabelText("Nome de quem recebeu"), "Maria Aparecida");
        await user.click(screen.getByRole("button", { name: "Confirmar entrega" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
                action: "deliver",
                receivedBy: "Maria Aparecida",
            }),
        );
    });

    it("antes de sair: só Retirei na unidade", async () => {
        mockApi({ "GET /api/courier/deliveries": { body: { items: [acceptedDelivery()] } } });
        renderApp({ route: "/entregas/d1", session: sessions.carlos });
        expect(
            await screen.findByRole("button", { name: "Retirei na unidade" }),
        ).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Entreguei" })).not.toBeInTheDocument();
    });
});
