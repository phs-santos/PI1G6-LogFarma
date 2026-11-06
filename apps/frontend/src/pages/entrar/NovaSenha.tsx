import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Button, Logo, Notice, TextField } from "@fatec-pi/style-guide";
import { resetPassword } from "../../api/auth";
import "../../app/porta.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Abre pelo link do e-mail (/nova-senha?codigo=...) e troca a senha. */
export function NovaSenha() {
    usePageTitle("Criar nova senha");
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get("codigo") ?? "";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [mismatch, setMismatch] = useState(false);

    const mutation = useMutation({
        mutationFn: () => resetPassword(token, password),
        onSuccess: () => navigate("/entrar", { replace: true, state: { passwordReset: true } }),
    });

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setMismatch(true);
            return;
        }
        setMismatch(false);
        mutation.mutate();
    };

    return (
        <div className="sg-mobile porta">
            <section className="porta__intro">
                <p className="porta__brand">
                    <Logo tone="white" />
                </p>
                <p className="porta__tagline">A plataforma que te conecta com sua saúde</p>
            </section>
            <main className="porta__sheet">
                <h1 className="porta__title">Criar nova senha</h1>
                {token ? (
                    <form className="porta__form" onSubmit={onSubmit}>
                        <TextField
                            id="nova-senha"
                            label="Nova senha"
                            hint="Pelo menos 8 letras ou números."
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            minLength={8}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <TextField
                            id="nova-senha-repetir"
                            label="Repita a nova senha"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            minLength={8}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            error={mismatch ? "As duas senhas não são iguais." : undefined}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="porta__reveal"
                            aria-controls="nova-senha nova-senha-repetir"
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
                            Salvar nova senha
                        </Button>
                    </form>
                ) : (
                    <Notice tone="attention" title="Este link está incompleto.">
                        <p>Abra de novo o link do e-mail ou peça um novo.</p>
                    </Notice>
                )}
                <div className="porta__footer">
                    <p>
                        <Link className="app-link" to="/recuperar-conta">
                            Pedir um novo link
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
