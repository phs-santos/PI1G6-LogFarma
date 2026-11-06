import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";
import { Button } from "../Button/Button";
import { expectNoAxeViolations } from "../../../test/setup";

describe("PageHeader", () => {
    it("título é o h1 da tela, com descrição e ações", async () => {
        const { container } = render(
            <PageHeader
                title="Usuários"
                description="Contas de quem trabalha na rede."
                actions={<Button>Criar conta</Button>}
            />,
        );
        expect(screen.getByRole("heading", { level: 1, name: "Usuários" })).toBeInTheDocument();
        expect(screen.getByText("Contas de quem trabalha na rede.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Criar conta" })).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("sem descrição nem ações, só o título", () => {
        const { container } = render(<PageHeader title="Pedidos" />);
        expect(container.querySelector(".sg-page-header__description")).toBeNull();
        expect(container.querySelector(".sg-page-header__actions")).toBeNull();
    });
});
