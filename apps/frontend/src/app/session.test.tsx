import { describe, expect, it } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../test/render";
import { mockApi } from "../../test/mockApi";
import { apiFetch } from "../api/client";

describe("sessão", () => {
    it('401 em qualquer chamada leva para Entrar com "Sua sessão terminou" e volta para a tela depois de entrar', async () => {
        mockApi({
            "GET /api/requests": { status: 401, body: { message: "Faça login para continuar." } },
            "POST /api/auth/login": { body: sessions.maria },
        });
        const { router } = renderApp({ route: "/pedidos", session: sessions.maria });
        await act(async () => {
            await apiFetch("/requests").catch(() => undefined);
        });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(router.state.location.search).toBe("?expirou=1&voltar=%2Fpedidos");
        expect(await screen.findByText("Sua sessão terminou. Entre de novo.")).toBeInTheDocument();

        const user = userEvent.setup();
        await user.type(screen.getByLabelText("E-mail"), "maria@exemplo.test");
        await user.type(screen.getByLabelText("Senha"), "senha-da-maria");
        await user.click(screen.getByRole("button", { name: "Entrar" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/pedidos"));
    });

    it("RequireRole manda o entregador que abre /gestao para /entregas", async () => {
        mockApi();
        const { router } = renderApp({ route: "/gestao", session: sessions.carlos });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entregas"));
    });

    it("quem não entrou e abre uma tela vai para Entrar com o caminho de volta", async () => {
        mockApi();
        const { router } = renderApp({ route: "/avisos" });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(router.state.location.search).toBe("?voltar=%2Favisos");
        expect(screen.queryByText("Sua sessão terminou. Entre de novo.")).not.toBeInTheDocument();
    });
});
