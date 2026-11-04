import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { notification } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Início", () => {
    it('Início mostra o aviso mais recente e "Avisos (2)"', async () => {
        mockApi({
            "GET /api/notifications": ({ url }) => ({
                body: {
                    items:
                        url.searchParams.get("unread") === "true"
                            ? [
                                  notification({
                                      id: "n2",
                                      title: "Seu remédio chegou",
                                      body: "A losartana já está na UBS Centro.",
                                      requestId: "r1",
                                  }),
                                  notification({ id: "n1", title: "Pedido recebido" }),
                              ]
                            : [],
                },
            }),
        });
        const { container } = renderApp({ route: "/", session: sessions.maria });
        expect(screen.getByRole("heading", { level: 1, name: "Olá, Maria" })).toBeInTheDocument();
        expect(screen.getByText("UBS Centro é a sua unidade")).toBeInTheDocument();
        expect(await screen.findByText("Seu remédio chegou")).toBeInTheDocument();
        expect(screen.getByText("A losartana já está na UBS Centro.")).toBeInTheDocument();
        expect(screen.queryByText("Pedido recebido")).not.toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Avisos (2)" })).toHaveAttribute("href", "/avisos");
        expect(screen.getByRole("link", { name: "Procurar remédio" })).toHaveAttribute(
            "href",
            "/buscar",
        );
        expect(screen.getByRole("link", { name: "Meus pedidos" })).toHaveAttribute(
            "href",
            "/pedidos",
        );
        await expectNoAxeViolations(container);
    });

    it("sem aviso novo: nada em destaque e só “Avisos”", async () => {
        const api = mockApi({ "GET /api/notifications": { body: { items: [] } } });
        renderApp({ route: "/", session: sessions.maria });
        await screen.findByRole("link", { name: "Avisos" });
        expect(api.calls.some((c) => c.path === "/api/notifications")).toBe(true);
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });
});
