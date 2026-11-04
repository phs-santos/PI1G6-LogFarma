import { describe, expect, it } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../test/render";
import { mockApi } from "../../test/mockApi";
import { apiFetch } from "../api/client";

describe("sessão", () => {
    it('401 em qualquer chamada leva para Entrar com "Sua sessão terminou" e volta para a tela depois de entrar', async () => {
        // A tela Meus pedidos chama a API ao abrir; o cookie venceu e a API responde 401.
        const api = mockApi({
            "GET /api/requests": { status: 401, body: { message: "Faça login para continuar." } },
            "POST /api/auth/login": { body: sessions.maria },
        });
        const { router } = renderApp({ route: "/pedidos", session: sessions.maria });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(router.state.location.search).toBe("?expirou=1&voltar=%2Fpedidos");
        expect(await screen.findByText("Sua sessão terminou. Entre de novo.")).toBeInTheDocument();

        api.set("GET /api/requests", { body: { items: [] } });
        const user = userEvent.setup();
        await user.type(screen.getByLabelText("E-mail"), "maria@exemplo.test");
        await user.type(screen.getByLabelText("Senha"), "senha-da-maria");
        await user.click(screen.getByRole("button", { name: "Entrar" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/pedidos"));
        expect(await screen.findByText("Você ainda não fez nenhum pedido.")).toBeInTheDocument();
    });

    it("401 de uma chamada solta também leva para Entrar", async () => {
        mockApi({
            "GET /api/me": { status: 401, body: { message: "Faça login para continuar." } },
        });
        const { router } = renderApp({ route: "/avisos", session: sessions.maria });
        await act(async () => {
            await apiFetch("/me").catch(() => undefined);
        });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(router.state.location.search).toBe("?expirou=1&voltar=%2Favisos");
    });

    it("RequireRole manda o entregador que abre /gestao para /entregas", async () => {
        mockApi();
        const { router } = renderApp({ route: "/gestao", session: sessions.carlos });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entregas"));
    });

    it("quem não entrou e abre o início vai para Entrar sem ?voltar", async () => {
        mockApi();
        const { router } = renderApp({ route: "/" });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(router.state.location.search).toBe("");
    });

    it("quem não entrou e abre uma tela vai para Entrar com o caminho de volta", async () => {
        mockApi();
        const { router } = renderApp({ route: "/avisos" });
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(router.state.location.search).toBe("?voltar=%2Favisos");
        expect(screen.queryByText("Sua sessão terminou. Entre de novo.")).not.toBeInTheDocument();
    });
});
