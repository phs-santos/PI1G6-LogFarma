import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { losartana } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Procurar remédio", () => {
    it("sugere enquanto digita e abre Onde tem", async () => {
        mockApi({
            "GET /api/medications": ({ url }) => ({
                body: { items: url.searchParams.get("search") === "losa" ? [losartana] : [] },
            }),
        });
        const { router, container } = renderApp({ route: "/buscar", session: sessions.maria });
        const user = userEvent.setup();
        await user.type(
            screen.getByRole("combobox", { name: "Qual remédio você precisa?" }),
            "losa",
        );
        const option = await screen.findByRole("option", { name: /Losartana potássica 50 mg/ });
        expect(option).toHaveTextContent("Leve a receita");
        await expectNoAxeViolations(container);
        await user.click(option);
        await waitFor(() => expect(router.state.location.pathname).toBe("/remedio/med-los"));
    });

    it("com uma letra só não busca", async () => {
        const api = mockApi();
        renderApp({ route: "/buscar", session: sessions.maria });
        const user = userEvent.setup();
        await user.type(screen.getByRole("combobox"), "l");
        await new Promise((r) => setTimeout(r, 400));
        expect(api.calls.filter((c) => c.path === "/api/medications")).toHaveLength(0);
    });
});

describe("Procurar remédio — mais procurados", () => {
    it("um toque em Mais procurados preenche a busca e mostra as sugestões", async () => {
        mockApi({
            "GET /api/medications": ({ url }) => ({
                body: { items: url.searchParams.get("search") === "losartana" ? [losartana] : [] },
            }),
        });
        renderApp({ route: "/buscar", session: sessions.maria });
        const user = userEvent.setup();
        const group = screen.getByRole("group", { name: "Mais procurados" });
        await user.click(within(group).getByRole("button", { name: "Losartana" }));
        expect(screen.getByRole("combobox", { name: "Qual remédio você precisa?" })).toHaveValue(
            "losartana",
        );
        expect(
            await screen.findByRole("option", { name: /Losartana potássica 50 mg/ }),
        ).toBeInTheDocument();
    });
});
