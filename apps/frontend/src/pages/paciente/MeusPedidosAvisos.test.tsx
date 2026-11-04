import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { notification, requestView } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Meus pedidos", () => {
    it("lista os pedidos com a situação em palavras", async () => {
        mockApi({
            "GET /api/requests": {
                body: { items: [requestView(), requestView({ id: "req-0", status: "picked_up" })] },
            },
        });
        const { container } = renderApp({ route: "/pedidos", session: sessions.maria });
        expect(await screen.findByText("Chegou na unidade")).toBeInTheDocument();
        expect(screen.getByText("Retirado")).toBeInTheDocument();
        expect(screen.getAllByRole("link", { name: /Losartana/ })[0]).toHaveAttribute(
            "href",
            "/pedidos/req-1",
        );
        await expectNoAxeViolations(container);
    });

    it("sem pedidos convida a procurar remédio", async () => {
        mockApi({ "GET /api/requests": { body: { items: [] } } });
        renderApp({ route: "/pedidos", session: sessions.maria });
        expect(await screen.findByText("Você ainda não fez nenhum pedido.")).toBeInTheDocument();
        expect(
            within(screen.getByRole("main")).getByRole("link", { name: "Procurar remédio" }),
        ).toBeInTheDocument();
    });
});

describe("Avisos", () => {
    it('marca "Novo" com palavra e, ao tocar, marca como lido e abre o pedido', async () => {
        const api = mockApi({
            "GET /api/notifications": {
                body: {
                    items: [
                        notification({ id: "n2", title: "Seu remédio chegou", requestId: "req-1" }),
                        notification({
                            id: "n1",
                            title: "Pedido recebido",
                            readAt: new Date().toISOString(),
                        }),
                    ],
                },
            },
            "POST /api/notifications/n2/read": { body: { ok: true } },
        });
        const { router, container } = renderApp({ route: "/avisos", session: sessions.maria });
        const novo = await screen.findByRole("button", { name: /Novo.*Seu remédio chegou/ });
        expect(screen.getAllByText("Novo")).toHaveLength(1);
        await expectNoAxeViolations(container);
        await userEvent.setup().click(novo);
        await waitFor(() => expect(router.state.location.pathname).toBe("/pedidos/req-1"));
        expect(
            api.calls.some((c) => c.method === "POST" && c.path === "/api/notifications/n2/read"),
        ).toBe(true);
    });
});
