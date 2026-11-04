import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { pharmacies } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

function api() {
    return mockApi({
        "GET /api/pharmacies": { body: { items: pharmacies } },
        "POST /api/auth/register": { status: 201, body: { user: sessions.maria.user } },
        "GET /api/auth/me": { body: sessions.maria },
        "GET /api/notifications": { body: { items: [] } },
    });
}

async function fillUntilLocation(user: ReturnType<typeof userEvent.setup>) {
    expect(screen.getByText("Passo 1 de 6")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nome completo"), "Maria Aparecida da Silva");
    await user.type(screen.getByLabelText("Data de nascimento"), "1951-03-12");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Passo 2 de 6")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Cartão SUS"), "898 0012 3456 7890");
    await user.type(screen.getByLabelText("Telefone com DDD"), "(16) 99123-4567");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Passo 3 de 6")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Rua"), "Rua Sete de Setembro");
    await user.type(screen.getByLabelText("Número"), "50");
    await user.type(screen.getByLabelText("Bairro"), "Centro");
    await user.clear(screen.getByLabelText("CEP"));
    await user.type(screen.getByLabelText("CEP"), "15900-000");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText("Passo 4 de 6")).toBeInTheDocument();
    await user.selectOptions(await screen.findByLabelText("Unidade"), "ph-centro");
}

async function finish(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Passo 5 de 6")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Tenho dificuldade para me locomover" }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Passo 6 de 6")).toBeInTheDocument();
    await user.type(screen.getByLabelText("E-mail"), "maria@exemplo.test");
    await user.type(screen.getByLabelText("Senha"), "uma-senha-boa");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
}

describe("Criar conta", () => {
    it("Criar conta segue sem localização quando a pessoa nega", async () => {
        vi.stubGlobal("navigator", {
            ...navigator,
            geolocation: {
                getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) =>
                    fail({ code: 1 } as GeolocationPositionError),
            },
        });
        const mock = api();
        const { router, container } = renderApp({ route: "/cadastro" });
        const user = userEvent.setup();
        await fillUntilLocation(user);
        await user.click(screen.getByRole("button", { name: "Usar minha localização" }));
        expect(
            await screen.findByText("Tudo bem, seguimos sem a sua localização."),
        ).toBeInTheDocument();
        await expectNoAxeViolations(container);
        await finish(user);
        await waitFor(() => expect(router.state.location.pathname).toBe("/"));
        const body = mock.calls.find((c) => c.path === "/api/auth/register")?.body as Record<
            string,
            unknown
        >;
        expect(body).not.toHaveProperty("latitude");
        expect(body).not.toHaveProperty("longitude");
        expect(body).toMatchObject({
            fullName: "Maria Aparecida da Silva",
            birthDate: "1951-03-12",
            cns: "898001234567890",
            phone: "16991234567",
            address: {
                street: "Rua Sete de Setembro",
                number: "50",
                district: "Centro",
                city: "Taquaritinga",
                state: "SP",
                zip: "15900000",
            },
            referencePharmacyId: "ph-centro",
            mobilityLimited: true,
            email: "maria@exemplo.test",
        });
        expect(body).not.toHaveProperty("priority");
    });

    it("Criar conta com localização envia as coordenadas", async () => {
        vi.stubGlobal("navigator", {
            ...navigator,
            geolocation: {
                getCurrentPosition: (ok: PositionCallback) =>
                    ok({
                        coords: { latitude: -21.406, longitude: -48.505 },
                    } as GeolocationPosition),
            },
        });
        const mock = api();
        renderApp({ route: "/cadastro" });
        const user = userEvent.setup();
        await fillUntilLocation(user);
        await user.click(screen.getByRole("button", { name: "Usar minha localização" }));
        expect(
            await screen.findByText("Pronto, vamos mostrar a distância até as unidades."),
        ).toBeInTheDocument();
        await finish(user);
        await waitFor(() =>
            expect(mock.calls.some((c) => c.path === "/api/auth/register")).toBe(true),
        );
        expect(mock.calls.find((c) => c.path === "/api/auth/register")?.body).toMatchObject({
            latitude: -21.406,
            longitude: -48.505,
        });
    });

    it("não passa do passo com campo errado e explica o porquê", async () => {
        api();
        renderApp({ route: "/cadastro" });
        const user = userEvent.setup();
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        expect(screen.getByText("Passo 1 de 6")).toBeInTheDocument();
        expect(screen.getByLabelText("Nome completo")).toHaveAccessibleDescription(
            "Escreva seu nome completo.",
        );
    });

    it("e-mail já usado volta ao passo do e-mail com a mensagem da API", async () => {
        const mock = api();
        mock.set("POST /api/auth/register", {
            status: 409,
            body: { message: "Já existe uma conta com este e-mail." },
        });
        vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
        renderApp({ route: "/cadastro" });
        const user = userEvent.setup();
        await fillUntilLocation(user);
        await finish(user);
        expect(await screen.findByText("Já existe uma conta com este e-mail.")).toBeInTheDocument();
        expect(screen.getByText("Passo 6 de 6")).toBeInTheDocument();
    });
});
