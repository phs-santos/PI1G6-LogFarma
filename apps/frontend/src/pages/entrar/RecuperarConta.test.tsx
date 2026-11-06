import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Recuperar conta", () => {
    it("Entrar tem o link Recuperar conta", async () => {
        mockApi();
        const { router } = renderApp({ route: "/entrar" });
        await userEvent.setup().click(await screen.findByRole("link", { name: "Recuperar conta" }));
        expect(router.state.location.pathname).toBe("/recuperar-conta");
    });

    it("manda o e-mail e mostra a mesma resposta para qualquer e-mail", async () => {
        const api = mockApi({ "POST /api/auth/password/forgot": { body: { ok: true } } });
        const { container } = renderApp({ route: "/recuperar-conta" });
        const user = userEvent.setup();
        await user.type(await screen.findByLabelText("E-mail"), "maria@exemplo.test");
        await user.click(screen.getByRole("button", { name: "Enviar link" }));
        expect(await screen.findByText("Pronto! Veja o seu e-mail.")).toBeInTheDocument();
        expect(api.calls[0]).toMatchObject({
            method: "POST",
            path: "/api/auth/password/forgot",
            body: { email: "maria@exemplo.test" },
        });
        await expectNoAxeViolations(container);
    });

    it("sem violações de acessibilidade (axe)", async () => {
        mockApi();
        const { container } = renderApp({ route: "/recuperar-conta" });
        await screen.findByRole("heading", { level: 1, name: "Recuperar conta" });
        await expectNoAxeViolations(container);
    });
});

describe("Nova senha", () => {
    async function fill(password: string, confirm: string) {
        const user = userEvent.setup();
        await user.type(await screen.findByLabelText(/^Nova senha/), password);
        await user.type(screen.getByLabelText("Repita a nova senha"), confirm);
        await user.click(screen.getByRole("button", { name: "Salvar nova senha" }));
    }

    it("salva a senha com o código do link e volta para Entrar com aviso", async () => {
        const api = mockApi({ "POST /api/auth/password/reset": { body: { ok: true } } });
        const { router } = renderApp({ route: "/nova-senha?codigo=abc123def456" });
        await fill("senha-nova-1", "senha-nova-1");
        expect(await screen.findByText("Senha nova salva. Entre com ela.")).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/entrar");
        expect(api.calls[0]).toMatchObject({
            body: { token: "abc123def456", password: "senha-nova-1" },
        });
    });

    it("senhas diferentes não enviam nada", async () => {
        const api = mockApi();
        renderApp({ route: "/nova-senha?codigo=abc123def456" });
        await fill("senha-nova-1", "senha-nova-2");
        expect(await screen.findByText("As duas senhas não são iguais.")).toBeInTheDocument();
        expect(api.calls).toHaveLength(0);
    });

    it("link vencido mostra a mensagem da API", async () => {
        mockApi({
            "POST /api/auth/password/reset": {
                status: 400,
                body: { message: "Este link de recuperação não vale mais. Peça um novo." },
            },
        });
        renderApp({ route: "/nova-senha?codigo=abc123def456" });
        await fill("senha-nova-1", "senha-nova-1");
        expect(await screen.findByRole("alert")).toHaveTextContent("Peça um novo");
    });

    it("sem código no endereço avisa e não mostra o formulário", async () => {
        mockApi();
        const { container } = renderApp({ route: "/nova-senha" });
        expect(await screen.findByText("Este link está incompleto.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Salvar nova senha" })).not.toBeInTheDocument();
        await expectNoAxeViolations(container);
    });
});
