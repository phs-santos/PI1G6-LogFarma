import {
    useEffect,
    useId,
    useRef,
    useState,
    type HTMLAttributes,
    type MouseEvent,
    type ReactNode,
} from "react";

export interface AppShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    /** Marca no topo do menu (ex.: o logo em versão branca). */
    brand: ReactNode;
    /** Itens do menu (links). O item da página atual usa `aria-current="page"`. */
    nav: ReactNode;
    /** Nome do menu para leitor de tela. */
    navLabel?: string;
    /** Fim do menu (ex.: botão Sair). */
    footer?: ReactNode;
    /** Texto do botão que abre o menu no celular. */
    menuLabel?: string;
    /** Texto do botão que fecha o menu no celular. */
    closeLabel?: string;
    children: ReactNode;
}

/**
 * Moldura do app: menu lateral em tinta azul no computador; no celular, barra no topo com o
 * botão "Menu" (ícone e palavra, para quem não conhece o ícone) que abre o menu como gaveta.
 * A gaveta fecha com Esc, no fundo escuro, no "Fechar menu" ou ao escolher um item.
 */
export function AppShell({
    brand,
    nav,
    navLabel = "Menu principal",
    footer,
    menuLabel = "Menu",
    closeLabel = "Fechar",
    children,
    className,
    ...props
}: AppShellProps) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    const menuButton = useRef<HTMLButtonElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);

    const close = () => {
        setOpen(false);
        menuButton.current?.focus();
    };

    useEffect(() => {
        if (!open) return;
        closeButton.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);

    // Escolheu um item (link) do menu: fecha a gaveta.
    const onNavClick = (e: MouseEvent<HTMLElement>) => {
        if (e.target instanceof Element && e.target.closest("a")) setOpen(false);
    };

    const classes = ["sg-app-shell", open && "sg-app-shell--open", className]
        .filter(Boolean)
        .join(" ");

    return (
        <div className={classes} {...props}>
            <header className="sg-app-shell__bar">
                <div className="sg-app-shell__brand">{brand}</div>
                <button
                    ref={menuButton}
                    type="button"
                    className="sg-app-shell__toggle"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpen(true)}
                >
                    <span className="sg-app-shell__icon" aria-hidden="true" />
                    {menuLabel}
                </button>
            </header>
            {open && <div className="sg-app-shell__backdrop" aria-hidden="true" onClick={close} />}
            <aside id={panelId} className="sg-app-shell__side">
                <div className="sg-app-shell__side-inner">
                    <div className="sg-app-shell__side-top">
                        <div className="sg-app-shell__brand">{brand}</div>
                        <button
                            ref={closeButton}
                            type="button"
                            className="sg-app-shell__close"
                            onClick={close}
                        >
                            <span aria-hidden="true">✕</span>
                            {closeLabel}
                        </button>
                    </div>
                    <nav className="sg-app-shell__nav" aria-label={navLabel} onClick={onNavClick}>
                        {nav}
                    </nav>
                    {footer && <div className="sg-app-shell__footer">{footer}</div>}
                </div>
            </aside>
            <main className="sg-app-shell__main">{children}</main>
        </div>
    );
}
