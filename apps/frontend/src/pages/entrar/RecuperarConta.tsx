import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Button, Logo, Notice, TextField } from "@fatec-pi/style-guide";
import { forgotPassword } from "../../api/auth";
import "../../app/porta.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Esqueceu a senha: pede o e-mail e manda o link para criar uma nova (vale para todos os perfis). */
export function RecuperarConta() {
    usePageTitle("Recuperar conta");
    const [email, setEmail] = useState("");
    const mutation = useMutation({ mutationFn: () => forgotPassword(email.trim()) });

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
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
                <h1 className="porta__title">Recuperar conta</h1>
                {mutation.isSuccess ? (
                    <Notice tone="success" title="Pronto! Veja o seu e-mail.">
                        <p>
                            Se esse e-mail tiver conta no LogFarma, enviamos um link para criar uma
                            nova senha. O link vale por 30 minutos. Não chegou? Olhe também a caixa
                            de spam.
                        </p>
                    </Notice>
                ) : (
                    <>
                        <p className="porta__hint">
                            Digite o e-mail do seu cadastro. Vamos mandar um link para você criar
                            uma nova senha.
                        </p>
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
                            {mutation.isError && (
                                <p className="sg-field__error" role="alert">
                                    {mutation.error.message}
                                </p>
                            )}
                            <Button type="submit" block size="lg" loading={mutation.isPending}>
                                Enviar link
                            </Button>
                        </form>
                    </>
                )}
                <div className="porta__footer">
                    <p>
                        <Link className="app-link" to="/entrar">
                            Voltar para Entrar
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
