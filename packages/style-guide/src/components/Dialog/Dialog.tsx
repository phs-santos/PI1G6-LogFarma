import { useId, type ReactNode } from "react";
import { useModalDialog } from "./useModalDialog";

export interface DialogProps {
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    /** Texto do botão de fechar no topo. */
    closeLabel?: string;
    /** `wide` para formulários maiores (conta); `xl` para formulários em colunas (medicamento). */
    size?: "default" | "wide" | "xl";
}

/**
 * Janela (modal) com título, "✕ Fechar" e conteúdo livre, no <dialog> nativo: prende o foco,
 * trava a rolagem de trás, fecha com Esc ou clique fora e devolve o foco. Para formulários de criar/editar; para "tem certeza?",
 * use o ConfirmDialog.
 */
export function Dialog({
    open,
    title,
    onClose,
    children,
    closeLabel = "Fechar",
    size = "default",
}: DialogProps) {
    const modal = useModalDialog(open, onClose);
    const titleId = useId();

    return (
        <dialog
            {...modal}
            className={`sg-dialog sg-dialog--form${size === "default" ? "" : ` sg-dialog--${size}`}`}
            aria-labelledby={titleId}
        >
            {open && (
                <div className="sg-dialog__inner">
                    <div className="sg-dialog__head">
                        <h2 id={titleId} className="sg-dialog__title">
                            {title}
                        </h2>
                        <button type="button" className="sg-dialog__close" onClick={onClose}>
                            <span aria-hidden="true">✕</span> {closeLabel}
                        </button>
                    </div>
                    <div className="sg-dialog__body">{children}</div>
                </div>
            )}
        </dialog>
    );
}
