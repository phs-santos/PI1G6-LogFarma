import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp, sessions } from "../../../test/render";
import { mockApi } from "../../../test/mockApi";
import { cena1Availability, pharmacies } from "../../../test/fixtures";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Outras unidades", () => {
    it("lista todas, com Farmácia Popular só para consulta e telefone", async () => {
        mockApi({
            "GET /api/medications/med-los/availability": { body: cena1Availability() },
            "GET /api/pharmacies": { body: { items: pharmacies } },
        });
        const { container } = renderApp({
            route: "/remedio/med-los/unidades",
            session: sessions.maria,
        });
        const list = await screen.findByRole("list", { name: "Unidades da rede" });
        expect(within(list).getAllByRole("listitem")).toHaveLength(4);
        expect(within(list).getByText("Só consulta: ligue antes")).toBeInTheDocument();
        expect(await within(list).findByRole("link", { name: "(16) 3252-9000" })).toHaveAttribute(
            "href",
            "tel:1632529000",
        );
        expect(within(list).getAllByText("Em falta")).toHaveLength(2);
        expect(within(list).getByText("Tem")).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });
});
