import { useEffect } from "react";

/** Título da aba/janela: "Procurar remédio — LogFarma". O leitor de tela também lê. */
export function usePageTitle(title: string): void {
    useEffect(() => {
        document.title = `${title} — LogFarma`;
    }, [title]);
}
