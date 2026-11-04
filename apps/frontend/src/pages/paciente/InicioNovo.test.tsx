import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { losartana, notification, requestView } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

function api() {
    return mockApi({
        "GET /api/notifications": {
            body: { items: [notification({ id: "n1", title: "Pedido recebido" })] },
        },
        "GET /api/me/recent-medications": {
            body: { items: [{ medication: losartana, viewedAt: new Date().toISOString() }] },
        },
        "GET /api/requests": {
            body: {
                items: [
                    requestView({ id: "req-1", status: "in_transfer" }),
                    requestView({ id: "req-0", status: "delivered" }),
                ],
            },
        },
        "DELETE /api/me/recent-medications": { body: { ok: true } },
        "GET /api/medications": { body: { items: [losartana] } },
    });
}

describe("Início com o que importa", () => {
    it("mostra buscas recentes, pedidos em andamento e avisos", async () => {
        api();
        const { container } = renderApp({ route: "/", session: sessions.maria });
        const recentes = await screen.findByRole("region", { name: "Você procurou recentemente" });
        expect(
            await within(recentes).findByRole("link", { name: /Losartana potássica 50 mg/ }),
        ).toHaveAttribute("href", "/remedio/med-los");
        const pedidos = screen.getByRole("region", { name: "Seus pedidos em andamento" });
        expect(await within(within(pedidos).getByRole("list")).findAllByRole("link")).toHaveLength(
            1,
        );
        expect(within(pedidos).getByText("A caminho da sua unidade")).toBeInTheDocument();
        expect(screen.getByRole("region", { name: "Avisos recentes" })).toHaveTextContent(
            "Pedido recebido",
        );
        expect(screen.getByRole("region", { name: "Bom saber" })).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("a busca do início leva para Procurar já com o texto", async () => {
        api();
        const { router } = renderApp({ route: "/", session: sessions.maria });
        const user = userEvent.setup();
        await user.type(
            screen.getByRole("searchbox", { name: "Qual remédio você precisa?" }),
            "losartana",
        );
        await user.click(screen.getByRole("button", { name: "Procurar" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/buscar"));
        expect(screen.getByRole("combobox", { name: "Qual remédio você precisa?" })).toHaveValue(
            "losartana",
        );
        expect(await screen.findByRole("option", { name: /Losartana/ })).toBeInTheDocument();
    });

    it("Procurar mostra as buscas recentes e deixa limpar", async () => {
        const mock = api();
        renderApp({ route: "/buscar", session: sessions.maria });
        const recentes = await screen.findByRole("region", { name: "Você procurou recentemente" });
        expect(
            await within(recentes).findByRole("link", { name: /Losartana/ }),
        ).toBeInTheDocument();
        await userEvent
            .setup()
            .click(within(recentes).getByRole("button", { name: "Limpar histórico" }));
        await waitFor(() => expect(mock.calls.some((c) => c.method === "DELETE")).toBe(true));
    });
});
