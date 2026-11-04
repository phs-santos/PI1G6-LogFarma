import type { ReactNode } from "react";

export interface AppHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

/** Topo em tinta azul, como o cabeçalho do receituário. */
export function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
    return (
        <header className="sg-app-header">
            <div>
                <p className="sg-app-header__title">{title}</p>
                {subtitle && <p className="sg-app-header__subtitle">{subtitle}</p>}
            </div>
            {actions && <div className="sg-app-header__actions">{actions}</div>}
        </header>
    );
}
