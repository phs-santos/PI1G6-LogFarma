import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stamp } from "./Stamp";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Stamp", () => {
    it("mostra o texto da situação com o tom", () => {
        render(<Stamp tone="danger">Em falta</Stamp>);
        const stamp = screen.getByText("Em falta");
        expect(stamp.className).toContain("sg-stamp--danger");
    });
    it("sem violações de acessibilidade", async () => {
        const { container } = render(<Stamp tone="ok">Tem</Stamp>);
        await expectNoAxeViolations(container);
    });
});
