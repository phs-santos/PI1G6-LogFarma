import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Logo, Notice, TextField } from "@fatec-pi/style-guide";
import { login } from "../../api/auth";
import type { Session } from "../../api/types";
import { qk } from "../../app/queryKeys";
import "./entrar.css";
import { afterLoginPath, homeFor, useSession } from "../../app/session";
import { usePageTitle } from "../../app/usePageTitle";

/** Tela única de entrada para todos os perfis. */
export function Entrar() {
    usePageTitle("Entrar");
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const client = useQueryClient();
    const { user } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const expired = params.get("expirou") === "1";
    const location = useLocation();
    const navState = location.state as { signedOut?: boolean; created?: boolean } | null;
    const signedOut = navState?.signedOut === true;
    const created = navState?.created === true;
    const voltar = params.get("voltar");

    const mutation = useMutation({
        mutationFn: () => login(email.trim(), password),
        onSuccess: (session) => {
            client.setQueryData<Session | null>(qk.me, session);
            navigate(afterLoginPath(session.user.role, voltar), { replace: true });
        },
    });

    // Quem já entrou vai para a sua tela (exceto quem acabou de sair ou chega com a sessão vencida).
    if (user && !expired && !signedOut && !mutation.isPending && !mutation.isSuccess) {
        return <Navigate to={homeFor(user.role)} replace />;
    }

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        mutation.mutate();
    };

    return (
        <div className="sg-mobile entrar">
            <section className="entrar__intro" aria-labelledby="entrar-promessa">
                <p className="entrar__brand">
                    <Logo tone="white" />
                </p>
                <p className="entrar__tagline">
                    Remédios do SUS em Taquaritinga, Matão e Monte Alto
                </p>
                <h2 id="entrar-promessa" className="entrar__promise">
                    Saiba onde tem o seu remédio antes de sair de casa.
                </h2>
                <p className="entrar__lead">
                    Veja em qual unidade do SUS ele está disponível, peça para retirar ou para
                    receber em casa, e acompanhe tudo pelo celular.
                </p>
                {/* Exemplo do que a pessoa vê depois de entrar (ilustração). */}
                <div className="entrar__sample" aria-hidden="true">
                    <p className="entrar__sample-med">Losartana potássica 50 mg</p>
                    <p className="entrar__sample-unit">UBS Jardim São Sebastião</p>
                    <p className="entrar__sample-facts">
                        <span className="sg-stamp sg-stamp--ok">Tem</span>
                        <span>A 1,1 km de você</span>
                    </p>
                </div>
            </section>

            <main className="entrar__sheet">
                <div className="entrar__letterhead">
                    <Logo className="entrar__letterhead-logo" />
                    <span className="entrar__letterhead-note">Serviço público e gratuito</span>
                </div>
                <h1 className="entrar__title">Entrar</h1>
                <p className="entrar__hint">Use o e-mail e a senha do seu cadastro.</p>
                {expired && <Notice tone="attention" title="Sua sessão terminou. Entre de novo." />}
                {created && (
                    <Notice
                        tone="success"
                        title="Sua conta foi criada. Entre com seu e-mail e senha."
                    />
                )}
                <form className="entrar__form" onSubmit={onSubmit}>
                    <TextField
                        label="E-mail"
                        type="email"
                        autoComplete="username"
                        inputMode="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        id="entrar-senha"
                        label="Senha"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="entrar__reveal"
                        aria-controls="entrar-senha"
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((v) => !v)}
                    >
                        {showPassword ? "Esconder senha" : "Mostrar senha"}
                    </Button>
                    {mutation.isError && (
                        <p className="sg-field__error" role="alert">
                            {mutation.error.message}
                        </p>
                    )}
                    <Button type="submit" block size="lg" loading={mutation.isPending}>
                        Entrar
                    </Button>
                </form>
                <div className="entrar__footer">
                    <p>
                        Ainda não tem conta?{" "}
                        <Link className="app-link" to="/cadastro">
                            Criar conta
                        </Link>
                    </p>
                    <p className="entrar__help">
                        Esqueceu a senha? Peça ajuda no balcão da sua unidade de saúde.
                    </p>
                </div>
            </main>
        </div>
    );
}
