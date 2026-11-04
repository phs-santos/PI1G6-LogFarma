import { Outlet, useLocation } from "react-router";
import { BackButton } from "./BackButton";

/** Celular da paciente: uma coluna, letra grande, "Voltar" nas telas internas. */
export function PatientLayout() {
    const { pathname } = useLocation();
    return (
        <div className="sg-mobile app-mobile">
            {pathname !== "/" && (
                <nav className="app-mobile__nav" aria-label="Navegação">
                    <BackButton home="/" />
                </nav>
            )}
            <main className="app-mobile__main">
                <Outlet />
            </main>
        </div>
    );
}
