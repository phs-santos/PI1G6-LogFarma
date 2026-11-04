import { Outlet, useLocation } from "react-router";
import { useSession, SignOutButton } from "../session";
import { BackButton } from "./BackButton";

/** Celular do entregador: como o da paciente, com "Sair" no topo (ele não tem "Meus dados"). */
export function CourierLayout() {
    const { pathname } = useLocation();
    const { profile } = useSession();
    return (
        <div className="sg-mobile app-mobile">
            <nav className="app-mobile__nav" aria-label="Navegação">
                {pathname !== "/entregas" ? (
                    <BackButton home="/entregas" />
                ) : (
                    <span>{profile?.kind === "courier" ? profile.fullName : ""}</span>
                )}
                <SignOutButton variant="ghost" />
            </nav>
            <main className="app-mobile__main">
                <Outlet />
            </main>
        </div>
    );
}
