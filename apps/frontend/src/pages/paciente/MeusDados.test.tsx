import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { caregiverJoana, patientProfile, pharmacies } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

const withPriority = patientProfile({
    priority: { category: "chronic", consentAt: "2026-10-01T12:00:00.000Z" },
});

function api() {
    return mockApi({
        "GET /api/me": { body: { profile: withPriority } },
        "PATCH /api/me": ({ body }) => ({
            body: {
                profile:
                    (body as { priority?: unknown }).priority !== undefined
                        ? patientProfile({ priority: null })
                        : withPriority,
            },
        }),
        "GET /api/me/caregivers": { body: { items: [caregiverJoana] } },
        "POST /api/me/caregivers": { status: 201, body: { caregiver: caregiverJoana } },
        "DELETE /api/me/caregivers/cg-1": { body: { ok: true } },
        "GET /api/pharmacies": { body: { items: pharmacies } },
        "POST /api/auth/logout": { body: { ok: true } },
    });
}

describe("Meus dados", () => {
    it("Retirar consentimento envia { priority: { revoke: true } }", async () => {
        const mock = api();
        const { container } = renderApp({ route: "/meus-dados", session: sessions.maria });
        expect(await screen.findByText("Doença crônica")).toBeInTheDocument();
        await expectNoAxeViolations(container);
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Retirar consentimento" }));
        const dialog = screen.getByRole("dialog", { name: "Retirar o consentimento?" });
        await user.click(within(dialog).getByRole("button", { name: "Sim, retirar" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "PATCH")?.body).toEqual({
                priority: { revoke: true },
            }),
        );
    });

    it("muda o telefone", async () => {
        const mock = api();
        renderApp({ route: "/meus-dados", session: sessions.maria });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Editar contato" }));
        const phone = screen.getByLabelText("Telefone com DDD");
        await user.clear(phone);
        await user.type(phone, "(16) 99000-1111");
        await user.click(screen.getByRole("button", { name: "Salvar" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "PATCH")?.body).toEqual({
                phone: "16990001111",
            }),
        );
        expect(await screen.findByText("Dados salvos.")).toBeInTheDocument();
        // Salvou: o formulário fecha e volta o resumo.
        expect(screen.queryByLabelText("Telefone com DDD")).not.toBeInTheDocument();
    });

    it("remove um responsável e sai", async () => {
        const mock = api();
        const { router } = renderApp({ route: "/meus-dados", session: sessions.maria });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Remover Joana da Silva" }));
        await waitFor(() => expect(mock.calls.some((c) => c.method === "DELETE")).toBe(true));
        // "Sair" aparece no topo (computador) e no fim de Meus dados (celular).
        await user.click(screen.getAllByRole("button", { name: "Sair" })[0]!);
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(router.state.location.search).toBe("");
    });

    it("abre com o endereço salvo, sem buscar o CEP no ViaCEP", async () => {
        const mock = api();
        renderApp({ route: "/meus-dados", session: sessions.maria });
        const endereco = await screen.findByRole("region", { name: "Endereço" });
        expect(await within(endereco).findByText(/Rua Sete de Setembro/)).toBeInTheDocument();
        await userEvent.setup().click(screen.getByRole("button", { name: "Editar endereço" }));
        expect(screen.getByLabelText("Rua")).toHaveValue("Rua Sete de Setembro");
        expect(mock.calls.some((c) => c.path.startsWith("/ws/"))).toBe(false);
    });

    it("abre como resumo: nenhum campo editável até tocar em Editar", async () => {
        api();
        const { container } = renderApp({ route: "/meus-dados", session: sessions.maria });
        await screen.findByRole("region", { name: "Contato" });
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("sem prioridade: Informar mostra a pergunta e exige o consentimento", async () => {
        const mock = mockApi({
            "GET /api/me": { body: { profile: patientProfile({ priority: null }) } },
            "PATCH /api/me": { body: { profile: withPriority } },
            "GET /api/me/caregivers": { body: { items: [] } },
            "GET /api/pharmacies": { body: { items: pharmacies } },
        });
        renderApp({ route: "/meus-dados", session: sessions.maria });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Informar condição de saúde" }));
        const group = screen.getByRole("radiogroup", {
            name: "Possui alguma condição listada abaixo?",
        });
        expect(within(group).getByLabelText("Não tenho / prefiro não dizer")).toBeChecked();
        await user.click(within(group).getByLabelText("Doença crônica"));
        expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
        await user.click(screen.getByLabelText(/Autorizo usar essa informação/));
        await user.click(screen.getByRole("button", { name: "Salvar" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "PATCH")?.body).toEqual({
                priority: { category: "chronic", consent: true },
            }),
        );
    });
});
