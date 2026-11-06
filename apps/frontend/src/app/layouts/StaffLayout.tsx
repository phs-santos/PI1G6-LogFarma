import type { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { AppShell, Logo } from "@fatec-pi/style-guide";
import type { MeProfile } from "../../api/types";
import { ManagerNav } from "../../pages/gestor/ManagerNav";
import { PharmacyNav } from "../../pages/farmacia/PharmacyNav";
import { useSession, SignOutButton } from "../session";
import { BackButton } from "./BackButton";

const OCCUPATION = { pharmacist: "farmacêutico(a)", pharmacy_assistant: "auxiliar de farmácia" };

/** Quem está logado e onde: aparece no fim do menu, acima do "Sair". */
function who(profile: MeProfile | null): { place: string; person?: string } {
    switch (profile?.kind) {
        case "pharmacy_staff":
            return {
                place: profile.pharmacy.name,
                person: `${profile.fullName}, ${OCCUPATION[profile.occupation]}`,
            };
        case "supplier_staff":
            return { place: profile.supplier.name, person: profile.fullName };
        case "manager":
            return { place: "Secretaria de Saúde", person: profile.fullName };
        case "courier":
            return { place: "Entregas", person: profile.fullName };
        default:
            return { place: "LogFarma" };
    }
}

function menuFor(profile: MeProfile | null): { label: string; home: string; items: ReactNode } {
    switch (profile?.kind) {
        case "pharmacy_staff":
            return { label: "Áreas da farmácia", home: "/farmacia", items: <PharmacyNav /> };
        case "manager":
            return { label: "Áreas da gestão", home: "/gestao", items: <ManagerNav /> };
        case "supplier_staff":
            return {
                label: "Menu principal",
                home: "/fornecedor",
                items: <NavLink to="/fornecedor">Pedidos de compra</NavLink>,
            };
        case "courier":
            return {
                label: "Menu principal",
                home: "/entregas",
                items: <NavLink to="/entregas">Entregas</NavLink>,
            };
        default:
            return { label: "Menu principal", home: "/", items: null };
    }
}

/**
 * Telas da equipe (farmácia, fornecedor, gestão e entregador), com o mesmo menu lateral do
 * paciente: itens do perfil, quem está logado e "Sair" no fim. O entregador usa o celular:
 * letra grande e "Voltar" nas telas internas.
 */
export function StaffLayout({ mobile = false }: { mobile?: boolean }) {
    const { profile } = useSession();
    const { pathname } = useLocation();
    const { place, person } = who(profile);
    const menu = menuFor(profile);
    return (
        <AppShell
            className={mobile ? "sg-mobile app-staff app-staff--mobile" : "app-staff"}
            brand={
                <NavLink
                    to={menu.home}
                    className="app-patient__brand"
                    aria-label="LogFarma, início"
                >
                    <Logo tone="white" />
                </NavLink>
            }
            navLabel={menu.label}
            nav={menu.items}
            footer={
                <>
                    <p className="app-who">
                        <strong>{place}</strong>
                        {person && <span>{person}</span>}
                    </p>
                    <SignOutButton variant="secondary" />
                </>
            }
        >
            {mobile && pathname !== menu.home && (
                <nav className="app-mobile__nav" aria-label="Navegação">
                    <BackButton home={menu.home} />
                </nav>
            )}
            <div className={mobile ? "app-mobile__main" : "app-desktop__main"}>
                <Outlet />
            </div>
        </AppShell>
    );
}
