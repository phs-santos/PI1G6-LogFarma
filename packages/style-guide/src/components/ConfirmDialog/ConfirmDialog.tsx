import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "../Button/Button";

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    children?: ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    /** Ação que desfaz algo (cancelar pedido, retirar consentimento). */
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** Pergunta de confirmação no <dialog> nativo: prende o foco, fecha com Esc e devolve o foco. */
export function ConfirmDialog({
    open,
    title,
    children,
    confirmLabel,
    cancelLabel,
    danger = false,
    loading = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            if (typeof dialog.showModal === "function") dialog.showModal();
            else dialog.setAttribute("open", "");
        } else if (!open && dialog.open) {
            if (typeof dialog.close === "function") dialog.close();
            else dialog.removeAttribute("open");
        }
    }, [open]);

    return (
        <dialog
            ref={ref}
            className="sg-dialog"
            aria-labelledby={titleId}
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
        >
            <h2 id={titleId} className="sg-dialog__title">
                {title}
            </h2>
            {children}
            <div className="sg-dialog__actions">
                <Button
                    variant={danger ? "danger" : "primary"}
                    block
                    loading={loading}
                    onClick={onConfirm}
                >
                    {confirmLabel}
                </Button>
                <Button variant="secondary" block onClick={onClose}>
                    {cancelLabel}
                </Button>
            </div>
        </dialog>
    );
}
