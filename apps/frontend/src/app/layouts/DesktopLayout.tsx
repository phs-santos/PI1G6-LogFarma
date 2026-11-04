import { Outlet } from "react-router";
import { AppHeader, Logo } from "@fatec-pi/style-guide";
import type { MeProfile } from "../../api/types";
import { useSession, SignOutButton } from "../session";

const OCCUPATION = { pharmacist: "farmacêutico(a)", pharmacy_assistant: "auxiliar de farmácia" };

function headerFor(profile: MeProfile | null): { title: string; subtitle?: string } {
    switch (profile?.kind) {
        case "pharmacy_staff":
            return {
                title: profile.pharmacy.name,
                subtitle: `${profile.fullName}, ${OCCUPATION[profile.occupation]}`,
            };
        case "supplier_staff":
            return { title: profile.supplier.name, subtitle: profile.fullName };
        case "manager":
            return { title: "Secretaria de Saúde", subtitle: profile.fullName };
        default:
            return { title: "LogFarma" };
    }
}

/** Computador (farmácia, fornecedor, gestor): topo com quem está e "Sair" sempre visível. */
export function DesktopLayout() {
    const { profile } = useSession();
    const { title, subtitle } = headerFor(profile);
    return (
        <div className="app-desktop">
            <AppHeader
                brand={<Logo tone="white" />}
                title={title}
                subtitle={subtitle}
                actions={<SignOutButton variant="secondary" />}
            />
            <main className="app-desktop__main">
                <Outlet />
            </main>
        </div>
    );
}
