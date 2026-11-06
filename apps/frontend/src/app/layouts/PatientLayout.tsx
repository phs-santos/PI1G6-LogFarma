import { NavLink, Outlet, useLocation } from "react-router";
import { AppShell, Logo } from "@fatec-pi/style-guide";
import { SignOutButton } from "../session";
import { BackButton } from "./BackButton";

const MENU: [string, string][] = [
    ["/", "Início"],
    ["/buscar", "Procurar remédio"],
    ["/pedidos", "Meus pedidos"],
    ["/avisos", "Avisos"],
    ["/meus-dados", "Meus dados"],
];

/**
 * Telas da paciente. Computador: menu lateral azul e a tela numa folha branca no resto da
 * largura. Celular: barra azul com "Menu" (abre o menu como gaveta, com "Sair" no fim),
 * letra grande e "Voltar" nas telas internas.
 */
export function PatientLayout() {
    const { pathname } = useLocation();
    return (
        <AppShell
            className="sg-mobile app-patient"
            brand={
                <NavLink to="/" className="app-patient__brand" aria-label="LogFarma, início">
                    <Logo tone="white" />
                </NavLink>
            }
            navLabel="Menu principal"
            nav={MENU.map(([to, label]) => (
                <NavLink key={to} to={to} end={to === "/"}>
                    {label}
                </NavLink>
            ))}
            footer={<SignOutButton variant="secondary" />}
        >
            {pathname !== "/" && (
                <nav className="app-mobile__nav app-mobile-only" aria-label="Navegação">
                    <BackButton home="/" />
                </nav>
            )}
            <div className="app-mobile__main">
                <Outlet />
            </div>
        </AppShell>
    );
}
