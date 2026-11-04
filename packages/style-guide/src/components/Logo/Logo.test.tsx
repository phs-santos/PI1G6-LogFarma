import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Logo, LogoSymbol } from "./Logo";
import { expectNoAxeViolations } from "../../../test/setup";

describe("Logo", () => {
    it("é uma imagem com o nome LogFarma e o texto visível", async () => {
        const { container } = render(<Logo />);
        expect(screen.getByRole("img", { name: "LogFarma" })).toBeInTheDocument();
        expect(screen.getByText("LogFarma")).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("versão branca para fundo azul", () => {
        const { container } = render(<Logo tone="white" />);
        expect(container.firstChild).toHaveClass("sg-logo--white");
    });

    it("símbolo sozinho decorativo quando há texto ao lado", () => {
        const { container } = render(<LogoSymbol decorative />);
        expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });
});
