import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { cena1Availability, pharmacies } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Vou buscar lá", () => {
    it("Vou buscar lá sem routeUrl abre o mapa pelo endereço", async () => {
        const resp = cena1Availability();
        resp.items = resp.items.map((i) => ({ ...i, distanceKm: null, routeUrl: null }));
        mockApi({
            "GET /api/medications/med-los/availability": { body: resp },
            "GET /api/pharmacies": { body: { items: pharmacies } },
        });
        const { container } = renderApp({
            route: "/remedio/med-los/buscar/ph-jardim",
            session: sessions.maria,
        });
        expect(
            await screen.findByRole("heading", { level: 1, name: "UBS Jardim São Sebastião" }),
        ).toBeInTheDocument();
        const address = "Rua São Sebastião, 455, Jardim São Sebastião, Taquaritinga";
        expect(screen.getByText(address)).toBeInTheDocument();
        expect(screen.getByText("Segunda a sexta, 7h às 17h")).toBeInTheDocument();
        expect(await screen.findByRole("link", { name: "(16) 3252-2000" })).toHaveAttribute(
            "href",
            "tel:1632522000",
        );
        expect(screen.getByRole("link", { name: "Abrir o caminho no mapa" })).toHaveAttribute(
            "href",
            `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
        );
        await expectNoAxeViolations(container);
    });

    it("com localização usa a rota da API", async () => {
        mockApi({
            "GET /api/medications/med-los/availability": { body: cena1Availability() },
            "GET /api/pharmacies": { body: { items: pharmacies } },
        });
        renderApp({ route: "/remedio/med-los/buscar/ph-jardim", session: sessions.maria });
        expect(
            await screen.findByRole("link", { name: "Abrir o caminho no mapa" }),
        ).toHaveAttribute("href", cena1Availability().items[3]!.routeUrl!);
    });
});
