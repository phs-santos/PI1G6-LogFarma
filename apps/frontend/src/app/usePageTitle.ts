import { useEffect } from "react";

/** Título da aba/janela: "Buscar medicamento — LogFarma". O leitor de tela também lê. */
export function usePageTitle(title: string): void {
    useEffect(() => {
        document.title = `${title} — LogFarma`;
    }, [title]);
}
