import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { cena1Availability } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

const route = "/remedio/med-los";

describe("Onde tem", () => {
    it('Onde tem mostra "A UBS Centro está sem" e "Tem na UBS Jardim São Sebastião"', async () => {
        mockApi({ "GET /api/medications/med-los/availability": { body: cena1Availability() } });
        const { container } = renderApp({ route, session: sessions.maria });
        expect(
            await screen.findByRole("heading", {
                level: 1,
                name: "Losartana potássica 50 mg comprimido",
            }),
        ).toBeInTheDocument();
        expect(screen.getByText("Leve a receita")).toBeInTheDocument();
        expect(screen.getByText("A UBS Centro está sem")).toBeInTheDocument();
        expect(screen.getByText("Em falta")).toBeInTheDocument();
        expect(screen.getByText("Tem na UBS Jardim São Sebastião")).toBeInTheDocument();
        expect(screen.getByText("A 1,1 km de você")).toBeInTheDocument();
        expect(screen.getByText("Atualizado há 2 h")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Vou buscar lá" })).toHaveAttribute(
            "href",
            "/remedio/med-los/buscar/ph-jardim",
        );
        expect(
            screen.getByRole("link", { name: "Não consigo ir — receber em casa" }),
        ).toHaveAttribute("href", "/pedido/novo?medicationId=med-los&fulfillment=delivery");
        expect(screen.getByRole("link", { name: "Ver outras unidades" })).toHaveAttribute(
            "href",
            "/remedio/med-los/unidades",
        );
        await expectNoAxeViolations(container);
    });

    it("Onde tem sem distância não mostra km", async () => {
        const resp = cena1Availability();
        resp.items = resp.items.map((i) => ({ ...i, distanceKm: null, routeUrl: null }));
        mockApi({ "GET /api/medications/med-los/availability": { body: resp } });
        renderApp({ route, session: sessions.maria });
        await screen.findByText("Tem na UBS Jardim São Sebastião");
        expect(screen.queryByText(/km/)).not.toBeInTheDocument();
    });

    it("Pedir assim mesmo aparece quando ninguém tem", async () => {
        const resp = cena1Availability();
        resp.foundInNetwork = false;
        resp.items = resp.items.map((i) => (i.kind === "pfpb" ? i : { ...i, status: "out" }));
        mockApi({ "GET /api/medications/med-los/availability": { body: resp } });
        const { container } = renderApp({ route, session: sessions.maria });
        expect(await screen.findByText("Este remédio está em falta na rede")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Pedir assim mesmo" })).toHaveAttribute(
            "href",
            "/pedido/novo?medicationId=med-los&waitlist=1",
        );
        expect(screen.queryByRole("link", { name: "Vou buscar lá" })).not.toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("a própria unidade tem: Tem na sua unidade", async () => {
        const resp = cena1Availability();
        resp.items = resp.items.map((i) => (i.isReference ? { ...i, status: "available" } : i));
        mockApi({ "GET /api/medications/med-los/availability": { body: resp } });
        renderApp({ route, session: sessions.maria });
        expect(await screen.findByText("Tem na sua unidade")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Vou buscar lá" })).toHaveAttribute(
            "href",
            "/remedio/med-los/buscar/ph-centro",
        );
        expect(screen.getByRole("link", { name: "Receber em casa" })).toBeInTheDocument();
    });
});
