import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "./Tabs";
import { expectNoAxeViolations } from "../../../test/setup";

const items = [
    { id: "pedidos", label: "Pedidos", count: 2 },
    { id: "transferencias", label: "Transferências" },
];

describe("Tabs", () => {
    it("marca aria-current no ativo e lê o contador", async () => {
        const onSelect = vi.fn();
        const { container } = render(
            <Tabs label="Áreas da farmácia" items={items} activeId="pedidos" onSelect={onSelect} />,
        );
        const active = screen.getByRole("button", { name: "Pedidos, 2 pendentes" });
        expect(active).toHaveAttribute("aria-current", "page");
        await userEvent.click(screen.getByRole("button", { name: "Transferências" }));
        expect(onSelect).toHaveBeenCalledWith("transferencias");
        await expectNoAxeViolations(container);
    });
});
