import { NavLink, Outlet, useLocation } from "react-router";
import { Logo } from "@fatec-pi/style-guide";
import { BackButton } from "./BackButton";

const MENU: [string, string][] = [
    ["/", "Início"],
    ["/buscar", "Procurar remédio"],
    ["/pedidos", "Meus pedidos"],
    ["/avisos", "Avisos"],
    ["/meus-dados", "Meus dados"],
];

/**
 * Telas da paciente. Celular: uma coluna, letra grande, "Voltar" nas telas internas.
 * Computador: topo azul com menu e a tela numa folha branca mais larga.
 */
export function PatientLayout() {
    const { pathname } = useLocation();
    return (
        <div className="sg-mobile app-mobile app-patient">
            <header className="app-top">
                <div className="app-top__inner">
                    <NavLink to="/" className="app-top__brand" aria-label="LogFarma, início">
                        <Logo tone="white" />
                    </NavLink>
                    <nav className="app-top__nav" aria-label="Menu principal">
                        {MENU.map(([to, label]) => (
                            <NavLink key={to} to={to} end={to === "/"} className="app-top__link">
                                {label}
                            </NavLink>
                        ))}
                    </nav>
                </div>
            </header>
            {pathname !== "/" && (
                <nav className="app-mobile__nav app-mobile-only" aria-label="Navegação">
                    <BackButton home="/" />
                </nav>
            )}
            <main className="app-mobile__main">
                <Outlet />
            </main>
        </div>
    );
}
