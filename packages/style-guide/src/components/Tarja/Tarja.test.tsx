import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tarja } from "./Tarja";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Tarja", () => {
    it("antimicrobiano mostra Receita retida na farmácia com faixa vermelha", () => {
        const { container } = render(<Tarja type="antimicrobial" />);
        expect(screen.getByText("Receita retida na farmácia")).toBeInTheDocument();
        expect(container.querySelector(".sg-tarja--red")).not.toBeNull();
    });
    it("controle especial usa faixa preta", () => {
        const { container } = render(<Tarja type="special_control" />);
        expect(
            screen.getByText("Receita de controle especial retida na farmácia"),
        ).toBeInTheDocument();
        expect(container.querySelector(".sg-tarja--black")).not.toBeNull();
    });
    it("sem receita não tem faixa colorida", () => {
        const { container } = render(<Tarja type="none" />);
        expect(screen.getByText("Não precisa de receita")).toBeInTheDocument();
        expect(container.querySelector(".sg-tarja__band")).toBeNull();
    });
    it("sem violações de acessibilidade", async () => {
        const { container } = render(<Tarja type="simple" />);
        await expectNoAxeViolations(container);
    });
});
