import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState, ErrorState, Spinner } from "./States";
import { expectNoAxeViolations } from "../../../test/setup";

describe("States", () => {
    it("ErrorState chama onRetry em Tentar de novo", async () => {
        const onRetry = vi.fn();
        render(<ErrorState message="Não foi possível carregar seus pedidos." onRetry={onRetry} />);
        await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
        expect(onRetry).toHaveBeenCalledOnce();
    });
    it("Spinner é status com rótulo", () => {
        render(<Spinner />);
        expect(screen.getByRole("status")).toHaveTextContent("Carregando");
    });
    it("sem violações de acessibilidade", async () => {
        const { container } = render(
            <div>
                <EmptyState title="Nenhum pedido ainda">
                    Quando você pedir um remédio, ele aparece aqui.
                </EmptyState>
                <ErrorState message="Falhou." onRetry={() => undefined} />
                <Spinner />
            </div>,
        );
        await expectNoAxeViolations(container);
    });
});
