import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Notice, TextField } from "@fatec-pi/style-guide";
import { login } from "../../api/auth";
import type { Session } from "../../api/types";
import { qk } from "../../app/queryKeys";
import { afterLoginPath, homeFor, useSession } from "../../app/session";

/** Tela única de entrada para todos os perfis. */
export function Entrar() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const client = useQueryClient();
    const { user } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const expired = params.get("expirou") === "1";
    const voltar = params.get("voltar");

    const mutation = useMutation({
        mutationFn: () => login(email.trim(), password),
        onSuccess: (session) => {
            client.setQueryData<Session | null>(qk.me, session);
            navigate(afterLoginPath(session.user.role, voltar), { replace: true });
        },
    });

    if (user && !mutation.isPending && !mutation.isSuccess) {
        return <Navigate to={homeFor(user.role)} replace />;
    }

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        mutation.mutate();
    };

    return (
        <div className="sg-mobile app-mobile">
            <main className="app-mobile__main">
                <header className="app-band">
                    <p className="app-band__brand">LogFarma</p>
                    <p>Onde tem o seu remédio na rede do SUS</p>
                </header>
                <h1>Entrar</h1>
                {expired && <Notice tone="attention" title="Sua sessão terminou. Entre de novo." />}
                <form className="app-form" onSubmit={onSubmit}>
                    <TextField
                        label="E-mail"
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        label="Senha"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button type="submit" block size="lg" loading={mutation.isPending}>
                        Entrar
                    </Button>
                </form>
                {mutation.isError && (
                    <p className="sg-field__error" role="alert">
                        {mutation.error.message}
                    </p>
                )}
                <p>
                    Ainda não tem conta?{" "}
                    <Link className="app-link" to="/cadastro">
                        Criar conta
                    </Link>
                </p>
            </main>
        </div>
    );
}
