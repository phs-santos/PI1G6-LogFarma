import { Outlet, useLocation } from "react-router";
import { Button } from "@fatec-pi/style-guide";
import { useSession, useSignOut } from "../session";
import { BackButton } from "./BackButton";

/** Celular do entregador: como o da paciente, com "Sair" no topo (ele não tem "Meus dados"). */
export function CourierLayout() {
    const { pathname } = useLocation();
    const { profile } = useSession();
    const signOut = useSignOut();
    return (
        <div className="sg-mobile app-mobile">
            <nav className="app-mobile__nav" aria-label="Navegação">
                {pathname !== "/entregas" ? (
                    <BackButton home="/entregas" />
                ) : (
                    <span>{profile?.kind === "courier" ? profile.fullName : ""}</span>
                )}
                <Button variant="ghost" onClick={() => void signOut()}>
                    Sair
                </Button>
            </nav>
            <main className="app-mobile__main">
                <Outlet />
            </main>
        </div>
    );
}
