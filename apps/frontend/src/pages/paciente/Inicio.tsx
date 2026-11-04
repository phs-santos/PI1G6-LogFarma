import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ActionList, Notice } from "@fatec-pi/style-guide";
import { listNotifications } from "../../api/notifications";
import { LIVE, qk } from "../../app/queryKeys";
import { useSession } from "../../app/session";
import { LinkButton } from "../../ui/LinkButton";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Início da paciente: o aviso que importa agora e três caminhos grandes. */
export function Inicio() {
    usePageTitle("Início");
    const { profile } = useSession();
    const unread = useQuery({
        queryKey: qk.notifications(true),
        queryFn: () => listNotifications(true),
        refetchInterval: LIVE,
    });
    const items = unread.data ?? [];
    const latest = items[0];
    const name = profile?.kind === "patient" ? profile.displayName.split(" ")[0] : "";
    const unit = profile?.kind === "patient" ? profile.referencePharmacy.name : "";

    return (
        <>
            <header className="app-band">
                <h1>Olá, {name}</h1>
                <p>{unit} é a sua unidade</p>
            </header>
            {/* Sempre na página: o leitor de tela anuncia o aviso que chegar. */}
            <div className="app-live" role="status" aria-live="polite">
                {latest && (
                    <Notice tone="info" title={latest.title}>
                        {latest.body && <p>{latest.body}</p>}
                        {latest.requestId && (
                            <Link className="app-link" to={`/pedidos/${latest.requestId}`}>
                                Ver o pedido
                            </Link>
                        )}
                    </Notice>
                )}
            </div>
            <ActionList label="O que você quer fazer">
                <LinkButton to="/buscar">Procurar remédio</LinkButton>
                <LinkButton to="/pedidos" variant="secondary">
                    Meus pedidos
                </LinkButton>
                <LinkButton to="/avisos" variant="secondary">
                    {items.length > 0 ? `Avisos (${items.length})` : "Avisos"}
                </LinkButton>
                <LinkButton to="/meus-dados" variant="secondary">
                    Meus dados
                </LinkButton>
            </ActionList>
        </>
    );
}
