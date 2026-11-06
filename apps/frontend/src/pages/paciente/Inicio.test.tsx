import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { notification, pharmacies } from "../../../test/fixtures";
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
        expect(await screen.findByText("Seu remédio chegou")).toBeInTheDocument();
        expect(screen.getByText("A losartana já está na UBS Centro.")).toBeInTheDocument();
        expect(screen.queryByText("Pedido recebido")).not.toBeInTheDocument();
        const acoes = within(screen.getByRole("navigation", { name: "O que você quer fazer" }));
        expect(acoes.getByRole("link", { name: "Avisos 2 novos" })).toHaveAttribute(
            "href",
            "/avisos",
        );
        expect(acoes.getByRole("link", { name: /^Meus pedidos/ })).toHaveAttribute(
            "href",
            "/pedidos",
        );
        await expectNoAxeViolations(container);
    });

    it("sem aviso novo: nada em destaque e “Nenhum aviso novo”", async () => {
        const api = mockApi({ "GET /api/notifications": { body: { items: [] } } });
        renderApp({ route: "/", session: sessions.maria });
        await within(screen.getByRole("navigation", { name: "O que você quer fazer" })).findByRole(
            "link",
            { name: "Avisos Nenhum aviso novo" },
        );
        expect(api.calls.some((c) => c.path === "/api/notifications")).toBe(true);
        expect(screen.getByRole("status")).toBeEmptyDOMElement();
    });

    it("mostra a unidade com endereço, telefone e Como chegar", async () => {
        mockApi({
            "GET /api/notifications": { body: { items: [] } },
            "GET /api/pharmacies": { body: { items: pharmacies } },
        });
        renderApp({ route: "/", session: sessions.maria });
        const unidade = screen.getByRole("region", { name: "Sua unidade" });
        expect(within(unidade).getByText("UBS Centro")).toBeInTheDocument();
        expect(
            await within(unidade).findByRole("link", { name: "(16) 3252-1000" }),
        ).toHaveAttribute("href", "tel:1632521000");
        expect(within(unidade).getByRole("link", { name: "Como chegar" })).toHaveAttribute(
            "href",
            expect.stringContaining("google.com/maps"),
        );
    });

    it("sem pedidos: convida a buscar o primeiro remédio", async () => {
        mockApi({ "GET /api/requests": { body: { items: [] } } });
        renderApp({ route: "/", session: sessions.maria });
        const convite = await screen.findByRole("region", { name: "Nenhum pedido em andamento" });
        expect(within(convite).getByRole("link", { name: "Buscar um remédio" })).toHaveAttribute(
            "href",
            "/buscar",
        );
    });
});
