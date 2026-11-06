import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { pharmacies } from "../../../test/fixtures";

async function goToAddress(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByLabelText("Nome completo"), "Maria Aparecida da Silva");
    await user.type(screen.getByLabelText("Data de nascimento"), "1951-03-12");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Cartão SUS"), "898001234567890");
    await user.type(screen.getByLabelText("Telefone com DDD"), "16991234567");
    expect(screen.getByLabelText("Cartão SUS")).toHaveValue("898 0012 3456 7890");
    expect(screen.getByLabelText("Telefone com DDD")).toHaveValue("(16) 99123-4567");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("Endereço pelo CEP", () => {
    it("preenche rua, bairro, cidade e UF pelo CEP", async () => {
        const api = mockApi({
            "GET /api/pharmacies": { body: { items: pharmacies } },
            "GET /ws/15990020/json/": {
                body: {
                    cep: "15990-020",
                    logradouro: "Rua João Pessoa",
                    bairro: "Centro",
                    localidade: "Matão",
                    uf: "SP",
                },
            },
        });
        renderApp({ route: "/cadastro" });
        const user = userEvent.setup();
        await goToAddress(user);
        await user.type(screen.getByLabelText("CEP"), "15990020");
        expect(screen.getByLabelText("CEP")).toHaveValue("15990-020");
        await waitFor(() => expect(screen.getByLabelText("Rua")).toHaveValue("Rua João Pessoa"));
        expect(screen.getByLabelText("Bairro")).toHaveValue("Centro");
        expect(screen.getByLabelText("Cidade")).toHaveValue("Matão");
        expect(screen.getByLabelText("Estado (UF)")).toHaveValue("SP");
        expect(
            screen.getByText("Endereço encontrado. Confira e informe o número."),
        ).toBeInTheDocument();
        expect(api.calls.some((c) => c.path === "/ws/15990020/json/")).toBe(true);
    });

    it("CEP que não existe: avisa e deixa preencher à mão", async () => {
        mockApi({
            "GET /api/pharmacies": { body: { items: pharmacies } },
            "GET /ws/99999999/json/": { body: { erro: "true" } },
        });
        renderApp({ route: "/cadastro" });
        const user = userEvent.setup();
        await goToAddress(user);
        await user.type(screen.getByLabelText("CEP"), "99999999");
        expect(
            await screen.findByText("Não achamos esse CEP. Preencha o endereço abaixo."),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Cidade")).toHaveValue("Taquaritinga");
    });

    it("tem o link para quem não sabe o CEP (Busca CEP dos Correios)", async () => {
        mockApi({ "GET /api/pharmacies": { body: { items: pharmacies } } });
        renderApp({ route: "/cadastro" });
        await goToAddress(userEvent.setup());
        expect(screen.getByRole("link", { name: "Buscar no site dos Correios" })).toHaveAttribute(
            "href",
            expect.stringContaining("buscacepinter.correios.com.br"),
        );
    });
});
