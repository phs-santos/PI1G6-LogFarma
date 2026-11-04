import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { expectNoAxeViolations } from "../../../test/setup";

async function fillAndSubmit(email: string, password: string) {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("E-mail"), email);
    await user.type(screen.getByLabelText("Senha"), password);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("Entrar", () => {
    it("Entrar leva a farmacêutica para /farmacia/pedidos", async () => {
        const api = mockApi({ "POST /api/auth/login": { body: sessions.ana } });
        const { router } = renderApp({ route: "/entrar" });
        await fillAndSubmit("ana@ubscentro.test", "senha-da-ana");
        await waitFor(() => expect(router.state.location.pathname).toBe("/farmacia/pedidos"));
        expect(api.calls[0]).toMatchObject({
            method: "POST",
            path: "/api/auth/login",
            body: { email: "ana@ubscentro.test", password: "senha-da-ana" },
        });
        expect(await screen.findByText("UBS Centro")).toBeInTheDocument();
    });

    it("Entrar mostra a mensagem da API em senha errada", async () => {
        mockApi({
            "POST /api/auth/login": {
                status: 401,
                body: { message: "E-mail ou senha incorretos." },
            },
        });
        const { router } = renderApp({ route: "/entrar" });
        await fillAndSubmit("maria@exemplo.test", "errada");
        expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
        expect(router.state.location.pathname).toBe("/entrar");
    });

    it("Entrar sem violações de acessibilidade (axe)", async () => {
        mockApi();
        const { container } = renderApp({ route: "/entrar?expirou=1" });
        await screen.findByRole("heading", { level: 1 });
        await expectNoAxeViolations(container);
    });
});
