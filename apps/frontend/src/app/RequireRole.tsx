import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Spinner } from "@fatec-pi/style-guide";
import type { UserRole } from "../api/types";
import { homeFor, useSession } from "./session";

export interface RequireRoleProps {
    roles: UserRole[];
    children: ReactNode;
}

/** Cada perfil só vê as próprias telas; quem não entrou vai para Entrar. */
export function RequireRole({ roles, children }: RequireRoleProps) {
    const { user, loading } = useSession();
    const location = useLocation();
    if (loading) return <Spinner label="Carregando" />;
    if (!user) {
        const params = new URLSearchParams({ voltar: location.pathname + location.search });
        return <Navigate to={`/entrar?${params.toString()}`} replace />;
    }
    if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
    return <>{children}</>;
}
