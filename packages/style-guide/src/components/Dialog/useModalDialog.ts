import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from "react";

// Quantos diálogos estão abertos: a rolagem da página só volta quando o último fecha.
let openCount = 0;
let savedOverflow = "";

function lockScroll() {
    if (openCount === 0) {
        savedOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
    }
    openCount += 1;
}

function unlockScroll() {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.documentElement.style.overflow = savedOverflow;
}

/**
 * Comportamento comum dos diálogos (<dialog> nativo): abre com showModal (prende o foco),
 * trava a rolagem da página de trás, fecha com Esc e com clique no fundo escuro (fora da
 * janela). O conteúdo precisa ficar num invólucro interno: clique no próprio <dialog> é fundo.
 */
export function useModalDialog(open: boolean, onClose: () => void) {
    const ref = useRef<HTMLDialogElement>(null);
    // O clique só fecha se começou e terminou no fundo (arrastar uma seleção não fecha).
    const pressedOnBackdrop = useRef(false);

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

    useEffect(() => {
        if (!open) return;
        lockScroll();
        return unlockScroll;
    }, [open]);

    return {
        ref,
        onCancel: (e: SyntheticEvent<HTMLDialogElement>) => {
            e.preventDefault();
            onClose();
        },
        onMouseDown: (e: MouseEvent<HTMLDialogElement>) => {
            pressedOnBackdrop.current = e.target === e.currentTarget;
        },
        onClick: (e: MouseEvent<HTMLDialogElement>) => {
            if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
            pressedOnBackdrop.current = false;
        },
    };
}
