import { describe, expect, it } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { requestView } from "../../../test/fixtures";
import { qk } from "../../app/queryKeys";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Seu pedido", () => {
    it("mostra a linha do tempo com o passo atual e a previsão", async () => {
        mockApi({
            "GET /api/requests/req-1": {
                body: {
                    request: requestView({
                        status: "waitlisted",
                        sourcePharmacy: null,
                        waitlistPosition: 2,
                        expectedAt: "2026-11-12",
                    }),
                },
            },
        });
        const { container } = renderApp({ route: "/pedidos/req-1", session: sessions.maria });
        const timeline = await screen.findByRole("list", { name: "Situação do pedido" });
        expect(within(timeline).getAllByRole("listitem")).toHaveLength(5);
        expect(screen.getByText("Previsão de chegada: 12/11")).toBeInTheDocument();
        expect(screen.getByText("Posição na lista de espera: 2º lugar")).toBeInTheDocument();
        expect(screen.getByText("Agora: Você entrou na lista de espera")).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("Seu pedido sem rede mantém a linha do tempo e mostra Tentar de novo", async () => {
        const api = mockApi({ "GET /api/requests/req-1": { body: { request: requestView() } } });
        const { client } = renderApp({ route: "/pedidos/req-1", session: sessions.maria });
        await screen.findByRole("list", { name: "Situação do pedido" });
        api.set("GET /api/requests/req-1", { networkError: true });
        await act(async () => {
            await client.refetchQueries({ queryKey: qk.request("req-1") });
        });
        expect(screen.getByRole("list", { name: "Situação do pedido" })).toBeInTheDocument();
        expect(await screen.findByText("Não foi possível atualizar agora.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    });

    it("Cancelar só aparece em requested e waitlisted", async () => {
        const api = mockApi({ "GET /api/requests/req-1": { body: { request: requestView() } } });
        const first = renderApp({ route: "/pedidos/req-1", session: sessions.maria });
        await screen.findByRole("list", { name: "Situação do pedido" });
        expect(screen.queryByRole("button", { name: "Cancelar pedido" })).not.toBeInTheDocument();
        first.unmount();

        api.set("GET /api/requests/req-1", {
            body: { request: requestView({ status: "requested", sourcePharmacy: null }) },
        });
        api.set("PATCH /api/requests/req-1", {
            body: { request: requestView({ status: "cancelled", sourcePharmacy: null }) },
        });
        renderApp({ route: "/pedidos/req-1", session: sessions.maria });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Cancelar pedido" }));
        const dialog = screen.getByRole("dialog", { name: "Cancelar este pedido?" });
        await user.click(within(dialog).getByRole("button", { name: "Sim, cancelar o pedido" }));
        expect(api.calls.find((c) => c.method === "PATCH")?.body).toEqual({ cancel: true });
    });

    it("entrega de remédio refrigerado lembra da geladeira", async () => {
        mockApi({
            "GET /api/requests/req-1": {
                body: {
                    request: requestView({
                        status: "delivery_scheduled",
                        delivery: {
                            id: "d1",
                            status: "scheduled",
                            scheduledWindow: "Amanhã, 8h às 12h",
                            requiresRefrigeration: true,
                        },
                    }),
                },
            },
        });
        renderApp({ route: "/pedidos/req-1", session: sessions.maria });
        expect(await screen.findByText("Ao receber, guarde na geladeira.")).toBeInTheDocument();
        expect(screen.getByText("Amanhã, 8h às 12h")).toBeInTheDocument();
    });
});
