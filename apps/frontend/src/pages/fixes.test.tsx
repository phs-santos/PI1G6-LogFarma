// Testes das correções da revisão final do branch (um por achado).
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../test/render";
import { mockApi, type MockHandler } from "../../test/mockApi";
import {
    caregiverJoana,
    cena1Availability,
    networkCena2,
    patientProfile,
    pharmacies,
    pharmacyItem,
    usablePrescription,
} from "../../test/fixtures";
import { qk } from "../app/queryKeys";

const never = () => new Promise<never>(() => undefined);

describe("revisão 1: balcão só sugere o próximo passo com estoque e rede carregados", () => {
    function api(stock: MockHandler) {
        return mockApi({
            "GET /api/pharmacy/requests": { body: { items: [pharmacyItem()] } },
            "GET /api/pharmacy/stock": stock,
            "GET /api/pharmacy/network-availability": { body: { items: networkCena2 } },
            "GET /api/pharmacy/transfers": { body: { items: [] } },
        });
    }

    it("enquanto o estoque carrega não mostra botão de ação", async () => {
        api(never);
        renderApp({ route: "/farmacia/pedidos/req-1", session: sessions.ana });
        const detail = await screen.findByRole("region", { name: "Pedido aberto" });
        await within(detail).findByText("898 0012 3456 7890");
        expect(
            within(detail).queryByRole("button", { name: /Pedir|Separar/ }),
        ).not.toBeInTheDocument();
    });

    it("se o estoque falha: aviso com Tentar de novo, sem 0 disponíveis e sem ação", async () => {
        api({ status: 500, body: { message: "erro" } });
        renderApp({ route: "/farmacia/pedidos/req-1", session: sessions.ana });
        const detail = await screen.findByRole("region", { name: "Pedido aberto" });
        expect(
            await within(detail).findByText("Não foi possível consultar o estoque."),
        ).toBeInTheDocument();
        expect(within(detail).getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
        expect(within(detail).queryByText(/0 disponíveis/)).not.toBeInTheDocument();
        expect(
            within(detail).queryByRole("button", { name: /Pedir ao fornecedor/ }),
        ).not.toBeInTheDocument();
    });
});

describe("revisão 2 e 4: Meus dados", () => {
    function api(patch: MockHandler = { body: { profile: patientProfile({ priority: null }) } }) {
        return mockApi({
            "GET /api/me": {
                body: {
                    profile: patientProfile({
                        priority: { category: "chronic", consentAt: "2026-10-01T12:00:00.000Z" },
                    }),
                },
            },
            "PATCH /api/me": patch,
            "GET /api/me/caregivers": { body: { items: [caregiverJoana] } },
            "GET /api/pharmacies": { body: { items: pharmacies } },
        });
    }

    it("salvar invalida a disponibilidade (unidade e distância mudam)", async () => {
        api();
        const { client } = renderApp({ route: "/meus-dados", session: sessions.maria });
        client.setQueryData(qk.availability("med-los"), cena1Availability());
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Salvar contato e endereço" }));
        await waitFor(() =>
            expect(client.getQueryState(qk.availability("med-los"))?.isInvalidated).toBe(true),
        );
    });

    it("o retorno aparece dentro da seção salva", async () => {
        api();
        renderApp({ route: "/meus-dados", session: sessions.maria });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Salvar contato e endereço" }));
        const contato = screen.getByRole("region", { name: "Contato e endereço" });
        expect(await within(contato).findByText("Dados salvos.")).toBeInTheDocument();
        expect(
            within(
                screen.getByRole("region", { name: "Prioridade na lista de espera" }),
            ).queryByText("Dados salvos."),
        ).not.toBeInTheDocument();
    });

    it("um erro novo apaga o sucesso anterior", async () => {
        let fail = false;
        api(() =>
            fail
                ? { status: 500, body: { message: "Falhou ao salvar." } }
                : { body: { profile: patientProfile() } },
        );
        renderApp({ route: "/meus-dados", session: sessions.maria });
        const user = userEvent.setup();
        const salvar = await screen.findByRole("button", { name: "Salvar contato e endereço" });
        await user.click(salvar);
        await screen.findByText("Dados salvos.");
        fail = true;
        await user.click(screen.getByRole("button", { name: "Salvar contato e endereço" }));
        expect(await screen.findByText("Falhou ao salvar.")).toBeInTheDocument();
        expect(screen.queryByText("Dados salvos.")).not.toBeInTheDocument();
    });

    it("o diálogo de retirar consentimento só fecha quando a API confirma", async () => {
        let release: () => void = () => undefined;
        api(
            () =>
                new Promise(
                    (resolve) =>
                        (release = () =>
                            resolve({ body: { profile: patientProfile({ priority: null }) } })),
                ),
        );
        renderApp({ route: "/meus-dados", session: sessions.maria });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Retirar consentimento" }));
        const dialog = screen.getByRole("dialog", { name: "Retirar o consentimento?" });
        await user.click(within(dialog).getByRole("button", { name: "Sim, retirar" }));
        expect(within(dialog).getByRole("button", { name: "Enviando…" })).toBeInTheDocument();
        release();
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
});

describe("revisão 3: Confirmar pedido espera os dados da paciente", () => {
    function api(prescriptions: MockHandler) {
        return mockApi({
            "GET /api/medications/med-los/availability": { body: cena1Availability() },
            "GET /api/me": { body: { profile: patientProfile() } },
            "GET /api/me/prescriptions": prescriptions,
            "GET /api/me/caregivers": { body: { items: [] } },
        });
    }

    it("com as receitas carregando o botão fica desabilitado", async () => {
        api(never);
        renderApp({
            route: "/pedido/novo?medicationId=med-los&fulfillment=delivery",
            session: sessions.maria,
        });
        expect(await screen.findByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
    });

    it("se as receitas falham: aviso com Tentar de novo e não envia", async () => {
        api({ status: 500, body: { message: "erro" } });
        renderApp({
            route: "/pedido/novo?medicationId=med-los&fulfillment=delivery",
            session: sessions.maria,
        });
        expect(
            await screen.findByText("Não foi possível carregar suas receitas."),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
    });

    it("com tudo carregado envia normalmente", async () => {
        api({ body: { items: [usablePrescription] } });
        renderApp({
            route: "/pedido/novo?medicationId=med-los&fulfillment=delivery",
            session: sessions.maria,
        });
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Confirmar pedido" })).toBeEnabled(),
        );
    });
});

describe("revisão 6: conta criada mesmo se a leitura da sessão falha", () => {
    it("vai para Entrar com o aviso de conta criada", async () => {
        mockApi({
            "GET /api/pharmacies": { body: { items: pharmacies } },
            "POST /api/auth/register": { status: 201, body: { user: sessions.maria.user } },
            "GET /api/auth/me": { status: 500, body: { message: "erro" } },
        });
        const { router } = renderApp({ route: "/cadastro" });
        const user = userEvent.setup();
        await user.type(screen.getByLabelText("Nome completo"), "Maria Aparecida da Silva");
        await user.type(screen.getByLabelText("Data de nascimento"), "1951-03-12");
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await user.type(screen.getByLabelText("Cartão SUS"), "898001234567890");
        await user.type(screen.getByLabelText("Telefone com DDD"), "16991234567");
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await user.type(screen.getByLabelText("Rua"), "Rua A");
        await user.type(screen.getByLabelText("Número"), "1");
        await user.type(screen.getByLabelText("Bairro"), "Centro");
        await user.type(screen.getByLabelText("CEP"), "15900000");
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await user.selectOptions(await screen.findByLabelText("Unidade"), "ph-centro");
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await user.click(screen.getByRole("button", { name: "Continuar" }));
        await user.type(screen.getByLabelText("E-mail"), "maria@exemplo.test");
        await user.type(screen.getByLabelText("Senha"), "uma-senha-boa");
        await user.click(screen.getByRole("button", { name: "Criar conta" }));
        await waitFor(() => expect(router.state.location.pathname).toBe("/entrar"));
        expect(
            await screen.findByText("Sua conta foi criada. Entre com seu e-mail e senha."),
        ).toBeInTheDocument();
    });
});

describe("revisão 10: Sair que falha avisa e mantém a pessoa na tela", () => {
    it("mostra o aviso e não vai para Entrar", async () => {
        mockApi({
            "GET /api/pharmacy/requests": { body: { items: [] } },
            "GET /api/pharmacy/transfers": { body: { items: [] } },
            "POST /api/auth/logout": { networkError: true },
        });
        const { router } = renderApp({ route: "/farmacia/pedidos", session: sessions.ana });
        await userEvent.setup().click(await screen.findByRole("button", { name: "Sair" }));
        expect(
            await screen.findByText("Não foi possível sair. Verifique a internet e tente de novo."),
        ).toBeInTheDocument();
        expect(router.state.location.pathname).toBe("/farmacia/pedidos");
    });
});
