import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
    it("abre com o título como nome e confirma ou fecha", async () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();
        render(
            <ConfirmDialog
                open
                title="Cancelar este pedido?"
                confirmLabel="Sim, cancelar"
                cancelLabel="Não, manter"
                danger
                onConfirm={onConfirm}
                onClose={onClose}
            >
                <p>Explicação curta.</p>
            </ConfirmDialog>,
        );
        const dialog = screen.getByRole("dialog", { name: "Cancelar este pedido?" });
        const user = userEvent.setup();
        await user.click(within(dialog).getByRole("button", { name: "Sim, cancelar" }));
        await user.click(within(dialog).getByRole("button", { name: "Não, manter" }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
