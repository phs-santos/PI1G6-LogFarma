import { useEffect, useId, useRef } from "react";
import { Button } from "@fatec-pi/style-guide";

interface Props {
    open: boolean;
    title: string;
    children?: React.ReactNode;
    confirmLabel: string;
    cancelLabel: string;
    danger?: boolean;
    loading?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** Pergunta de confirmação no <dialog> nativo: prende o foco e fecha com Esc. */
export function ConfirmDialog(props: Props) {
    const {
        open,
        title,
        children,
        confirmLabel,
        cancelLabel,
        danger,
        loading,
        onConfirm,
        onClose,
    } = props;
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
            className="app-dialog"
            aria-labelledby={titleId}
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
        >
            <h2 id={titleId}>{title}</h2>
            {children}
            <div className="app-dialog__actions">
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
