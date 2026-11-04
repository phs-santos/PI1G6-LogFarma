import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, ScrollRestoration, useLocation, useNavigate } from "react-router";
import { getMe, logout } from "../api/auth";
import { ApiError, UNAUTHORIZED_EVENT } from "../api/client";
import { Button, type ButtonVariant } from "@fatec-pi/style-guide";
import type { MeProfile, Session, SessionUser, UserRole } from "../api/types";
import { qk } from "./queryKeys";
import { useFocusOnNavigate } from "./useFocusOnNavigate";

/** Tela inicial de cada perfil. */
export function homeFor(role: UserRole): string {
    switch (role) {
        case "patient":
            return "/";
        case "pharmacy_staff":
            return "/farmacia/pedidos";
        case "courier":
            return "/entregas";
        case "supplier_staff":
            return "/fornecedor";
        case "manager":
            return "/gestao";
    }
}

/** De qual perfil é um endereço do app (para decidir se dá para voltar a ele depois de entrar). */
export function roleForPath(path: string): UserRole {
    if (path.startsWith("/farmacia")) return "pharmacy_staff";
    if (path.startsWith("/entregas")) return "courier";
    if (path.startsWith("/fornecedor")) return "supplier_staff";
    if (path.startsWith("/gestao")) return "manager";
    return "patient";
}

/** Para onde ir depois de entrar: a tela de antes, se for do mesmo perfil e deste app. */
export function afterLoginPath(role: UserRole, voltar: string | null): string {
    const safe = voltar && voltar.startsWith("/") && !voltar.startsWith("//");
    if (safe && !voltar.startsWith("/entrar") && roleForPath(voltar) === role) return voltar;
    return homeFor(role);
}

export interface SessionState {
    user: SessionUser | null;
    profile: MeProfile | null;
    loading: boolean;
}

export function useSession(): SessionState {
    const { data, isPending } = useQuery({
        queryKey: qk.me,
        queryFn: getMe,
        staleTime: Infinity,
    });
    return {
        user: data?.user ?? null,
        profile: data?.profile ?? null,
        loading: isPending,
    };
}

const SIGN_OUT_FAILED = "Não foi possível sair. Verifique a internet e tente de novo.";

/**
 * Sair: avisa a API e só então esquece tudo o que estava em cache e vai para Entrar.
 * Se a API não responde, a sessão continua valendo no servidor: avisa e fica na tela
 * (num celular compartilhado, "sair" que não saiu é pior que um aviso).
 */
export function useSignOut() {
    const client = useQueryClient();
    const navigate = useNavigate();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const signOut = async () => {
        if (pending) return;
        setPending(true);
        setError("");
        try {
            await logout();
        } catch (err) {
            // 401: a sessão já tinha acabado; o resto do app cuida (vai para Entrar).
            if (!(err instanceof ApiError && err.status === 401)) {
                setPending(false);
                setError(SIGN_OUT_FAILED);
                return;
            }
        }
        // Navega antes de esquecer a sessão (mesma razão do aviso de sessão vencida).
        void navigate("/entrar", { replace: true, flushSync: true, state: { signedOut: true } });
        client.removeQueries({ predicate: (q) => q.queryKey[0] !== qk.me[0] });
        client.setQueryData<Session | null>(qk.me, null);
    };
    return { signOut, pending, error };
}

export function SignOutButton(props: { variant: ButtonVariant; block?: boolean }) {
    const { signOut, pending, error } = useSignOut();
    return (
        <>
            <Button
                variant={props.variant}
                block={props.block}
                loading={pending}
                onClick={() => void signOut()}
            >
                Sair
            </Button>
            {error && (
                <p className="app-signout-error" role="alert">
                    {error}
                </p>
            )}
        </>
    );
}

/**
 * Raiz de todas as rotas: carrega a sessão e cuida da sessão que expira.
 * Um 401 com alguém dentro leva para Entrar com "Sua sessão terminou" e guarda a tela atual.
 */
export function SessionRoot() {
    const client = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const here = useRef("");
    here.current = location.pathname + location.search;
    useSession();
    useFocusOnNavigate();

    useEffect(() => {
        const onUnauthorized = () => {
            const current = client.getQueryData<Session | null>(qk.me);
            if (!current) return; // ninguém tinha entrado: o próprio guarda manda para Entrar
            // Primeiro Entrar aparece de fato (flushSync: sem transição adiada); só então a
            // sessão é esquecida. Na ordem inversa a guarda de perfil redirecionaria sozinha,
            // sem o "Sua sessão terminou".
            const params = new URLSearchParams({ expirou: "1" });
            if (here.current !== "/") params.set("voltar", here.current);
            void client.cancelQueries();
            void navigate(`/entrar?${params.toString()}`, { replace: true, flushSync: true });
            client.removeQueries({ predicate: (q) => q.queryKey[0] !== qk.me[0] });
            client.setQueryData<Session | null>(qk.me, null);
        };
        window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    }, [client, navigate]);

    return (
        <>
            <ScrollRestoration />
            <Outlet />
        </>
    );
}
