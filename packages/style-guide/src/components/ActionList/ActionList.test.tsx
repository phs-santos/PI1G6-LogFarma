import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionList } from "./ActionList";
import { Button } from "../Button/Button";
import { expectNoAxeViolations } from "../../../test/setup";

describe("ActionList", () => {
    it("é uma navegação com rótulo e botões em bloco", async () => {
        const { container } = render(
            <ActionList label="O que você quer fazer">
                <Button>Procurar remédio</Button>
                <Button variant="secondary">Meus pedidos</Button>
            </ActionList>,
        );
        expect(
            screen.getByRole("navigation", { name: "O que você quer fazer" }),
        ).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });
});
