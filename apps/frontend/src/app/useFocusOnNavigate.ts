import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

/**
 * Ao trocar de tela (não na primeira carga), leva o foco ao título da tela nova, para o
 * leitor de tela anunciar onde a pessoa chegou. Se o título ainda está carregando, espera
 * até 5 s por ele.
 */
export function useFocusOnNavigate(): void {
    const { pathname } = useLocation();
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const focus = (): boolean => {
            const h1 = document.querySelector<HTMLElement>("main h1");
            if (!h1) return false;
            if (!h1.hasAttribute("tabindex")) h1.setAttribute("tabindex", "-1");
            h1.focus({ preventScroll: true });
            return true;
        };
        if (focus()) return;
        const observer = new MutationObserver(() => {
            if (focus()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const timer = setTimeout(() => observer.disconnect(), 5000);
        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [pathname]);
}
