import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
    it("renderiza o título como h2", () => {
        render(<Card title="Seu pedido">conteúdo</Card>);
        expect(screen.getByRole("heading", { level: 2, name: "Seu pedido" })).toBeInTheDocument();
    });

    it("não usa sombra (linguagem do receituário)", () => {
        const css = readFileSync(resolve(process.cwd(), "src/components/Card/Card.css"), "utf8");
        expect(css).not.toContain("box-shadow");
    });
});
