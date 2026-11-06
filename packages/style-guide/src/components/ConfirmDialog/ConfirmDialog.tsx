import { useId, type ReactNode } from "react";
import { useModalDialog } from "../Dialog/useModalDialog";
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

/** Pergunta de confirmação no <dialog> nativo: prende o foco, trava a rolagem de trás, fecha com Esc ou clique fora e devolve o foco. */
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
    const modal = useModalDialog(open, onClose);
    const titleId = useId();

    return (
        <dialog {...modal} className="sg-dialog" aria-labelledby={titleId}>
            <div className="sg-dialog__inner">
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
            </div>
        </dialog>
    );
}
