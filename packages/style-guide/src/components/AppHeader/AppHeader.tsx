import type { ReactNode } from "react";

export interface AppHeaderProps {
    title: string;
    subtitle?: string;
    /** Marca à esquerda do título (ex.: o logo em versão branca). */
    brand?: ReactNode;
    actions?: ReactNode;
}

/** Topo em tinta azul, como o cabeçalho do receituário. */
export function AppHeader({ title, subtitle, brand, actions }: AppHeaderProps) {
    return (
        <header className="sg-app-header">
            {brand && <div className="sg-app-header__brand">{brand}</div>}
            <div className="sg-app-header__main">
                <p className="sg-app-header__title">{title}</p>
                {subtitle && <p className="sg-app-header__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="sg-app-header__actions">{actions}</div>}
        </header>
    );
}
