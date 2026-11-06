import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Logo, Notice, Segmented, TextField } from "@fatec-pi/style-guide";
import { login } from "../../api/auth";
import type { Session } from "../../api/types";
import { qk } from "../../app/queryKeys";
import "../../app/porta.css";
import { afterLoginPath, homeFor, roleForPath, useSession } from "../../app/session";
import { usePageTitle } from "../../app/usePageTitle";

type Audience = "paciente" | "equipe";

/** Tela única de entrada para todos os perfis (paciente ou equipe muda só os textos). */
export function Entrar() {
    usePageTitle("Entrar");
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const client = useQueryClient();
    const { user } = useSession();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const expired = params.get("expirou") === "1";
    const location = useLocation();
    const navState = location.state as {
        signedOut?: boolean;
        created?: boolean;
        passwordReset?: boolean;
    } | null;
    const signedOut = navState?.signedOut === true;
    const created = navState?.created === true;
    const passwordReset = navState?.passwordReset === true;
    const voltar = params.get("voltar");
    // Paciente é o padrão; vem marcado "equipe" pelo link ?perfil=equipe ou se a tela de volta é da equipe.
    const team =
        params.get("perfil") === "equipe" || (voltar !== null && roleForPath(voltar) !== "patient");
    const setTeam = (value: Audience) => {
        const next = new URLSearchParams(params);
        if (value === "equipe") next.set("perfil", "equipe");
        else next.delete("perfil");
        setParams(next, { replace: true });
    };

    const mutation = useMutation({
        mutationFn: () => login(email.trim(), password, team ? "team" : "patient"),
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
        <div className="sg-mobile porta">
            <section className="porta__intro" aria-labelledby="entrar-promessa">
                <p className="porta__brand">
                    <Logo tone="white" />
                </p>
                <p className="porta__tagline">
                    Remédios do SUS em Taquaritinga, Matão e Monte Alto
                </p>
                {team ? (
                    <>
                        <h2 id="entrar-promessa" className="porta__promise">
                            Pedidos, estoque e entregas da rede num só lugar.
                        </h2>
                        <p className="porta__lead">
                            O balcão mostra o próximo passo de cada pedido: separar, pedir a outra
                            unidade, comprar do fornecedor ou agendar a entrega.
                        </p>
                        {/* Exemplo do balcão (ilustração). */}
                        <div className="porta__sample" aria-hidden="true">
                            <p className="porta__sample-med">Losartana potássica 50 mg, 30 un.</p>
                            <p className="porta__sample-unit">Maria Aparecida, entrega em casa</p>
                            <p className="porta__sample-facts">
                                <span className="porta__sample-action">
                                    Pedir à UBS Jardim São Sebastião
                                </span>
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 id="entrar-promessa" className="porta__promise">
                            Saiba onde tem o seu remédio antes de sair de casa.
                        </h2>
                        <p className="porta__lead">
                            Veja em qual unidade do SUS ele está disponível, peça para retirar ou
                            para receber em casa, e acompanhe tudo pelo celular.
                        </p>
                        {/* Exemplo do que a pessoa vê depois de entrar (ilustração). */}
                        <div className="porta__sample" aria-hidden="true">
                            <p className="porta__sample-med">Losartana potássica 50 mg</p>
                            <p className="porta__sample-unit">UBS Jardim São Sebastião</p>
                            <p className="porta__sample-facts">
                                <span className="sg-stamp sg-stamp--ok">Tem</span>
                                <span>A 1,1 km de você</span>
                            </p>
                        </div>
                    </>
                )}
            </section>

            <main className="porta__sheet">
                <div className="porta__letterhead">
                    <Logo className="porta__letterhead-logo" />
                    <span className="porta__letterhead-note">
                        {team ? "Área da equipe" : "Serviço público e gratuito"}
                    </span>
                </div>
                <Segmented<Audience>
                    className="porta__audience"
                    label="Quem está entrando"
                    value={team ? "equipe" : "paciente"}
                    onChange={setTeam}
                    options={[
                        { value: "paciente", label: "Sou paciente" },
                        {
                            value: "equipe",
                            label: "Sou da equipe",
                            hint: "Farmácia, fornecedor, entrega ou gestão",
                        },
                    ]}
                />
                <h1 className="porta__title">{team ? "Entrar na área da equipe" : "Entrar"}</h1>
                <p className="porta__hint">
                    {team
                        ? "Use o e-mail e a senha que o gestor da rede criou para você."
                        : "Use o e-mail e a senha do seu cadastro."}
                </p>
                {expired && <Notice tone="attention" title="Sua sessão terminou. Entre de novo." />}
                {created && (
                    <Notice
                        tone="success"
                        title="Sua conta foi criada. Entre com seu e-mail e senha."
                    />
                )}
                {passwordReset && (
                    <Notice tone="success" title="Senha nova salva. Entre com ela." />
                )}
                <form className="porta__form" onSubmit={onSubmit}>
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
                        className="porta__reveal"
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
                <div className="porta__footer">
                    {team ? (
                        <>
                            <p>
                                Esqueceu a senha?{" "}
                                <Link className="app-link" to="/recuperar-conta">
                                    Recuperar conta
                                </Link>
                            </p>
                            <p className="porta__help">
                                As contas da equipe são criadas pelo gestor da rede.
                            </p>
                        </>
                    ) : (
                        <>
                            <p>
                                Ainda não tem conta?{" "}
                                <Link className="app-link" to="/cadastro">
                                    Criar conta
                                </Link>
                            </p>
                            <p>
                                Esqueceu a senha?{" "}
                                <Link className="app-link" to="/recuperar-conta">
                                    Recuperar conta
                                </Link>
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
