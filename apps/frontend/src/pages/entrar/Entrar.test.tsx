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

describe("Entrar — paciente ou equipe", () => {
    it("começa em paciente, com Criar conta", async () => {
        mockApi();
        renderApp({ route: "/entrar" });
        expect(await screen.findByRole("radio", { name: "Sou paciente" })).toBeChecked();
        expect(screen.getByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Criar conta" })).toBeInTheDocument();
    });

    it("Sou da equipe muda o texto, esconde Criar conta e guarda no endereço", async () => {
        mockApi();
        const { router, container } = renderApp({ route: "/entrar?voltar=%2Fpedidos%2F123" });
        await userEvent.setup().click(await screen.findByRole("radio", { name: /Sou da equipe/ }));
        expect(
            screen.getByRole("heading", { level: 1, name: "Entrar na área da equipe" }),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Use o e-mail e a senha que o gestor da rede criou para você."),
        ).toBeInTheDocument();
        expect(screen.queryByRole("link", { name: "Criar conta" })).not.toBeInTheDocument();
        expect(router.state.location.search).toBe("?voltar=%2Fpedidos%2F123&perfil=equipe");
        await expectNoAxeViolations(container);
    });

    it("o link ?perfil=equipe já abre na área da equipe", async () => {
        mockApi();
        renderApp({ route: "/entrar?perfil=equipe" });
        expect(await screen.findByRole("radio", { name: /Sou da equipe/ })).toBeChecked();
    });
});
