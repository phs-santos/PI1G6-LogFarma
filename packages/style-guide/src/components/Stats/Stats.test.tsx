import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarList, StatTile } from "./Stats";
import { expectNoAxeViolations } from "../../../test/setup";

describe("StatTile e BarList", () => {
    it("BarList mostra o valor escrito", async () => {
        const { container } = render(
            <>
                <StatTile value={23} label="Buscas sem estoque (7 dias)" />
                <BarList
                    label="Remédios mais procurados sem estoque"
                    items={[
                        { label: "Adalimumabe", value: 11 },
                        { label: "Clonazepam", value: 4 },
                    ]}
                />
            </>,
        );
        expect(screen.getByText("Adalimumabe: 11")).toBeInTheDocument();
        expect(screen.getByText("23")).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });
});
