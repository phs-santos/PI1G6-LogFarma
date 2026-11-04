import { Link } from "react-router";

export function NaoEncontrada() {
    return (
        <div className="sg-mobile app-mobile">
            <main className="app-mobile__main">
                <h1>Página não encontrada</h1>
                <p>O endereço aberto não existe no LogFarma.</p>
                <p>
                    <Link className="app-link" to="/">
                        Ir para o início
                    </Link>
                </p>
            </main>
        </div>
    );
}
