import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@fatec-pi/style-guide";
import { listRequests } from "../../api/requests";
import { qk, REGULAR } from "../../app/queryKeys";
import { formatDayTime } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { LinkButton } from "../../ui/LinkButton";
import { STATUS_TEXT } from "./statusText";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

export function MeusPedidos() {
    usePageTitle("Meus pedidos");
    const query = useQuery({
        queryKey: qk.requests,
        queryFn: listRequests,
        refetchInterval: REGULAR,
    });
    return (
        <>
            <h1>Meus pedidos</h1>
            <Loaded query={query} what="seus pedidos">
                {(items) =>
                    items.length === 0 ? (
                        <EmptyState
                            title="Você ainda não fez nenhum pedido."
                            action={<LinkButton to="/buscar">Procurar remédio</LinkButton>}
                        />
                    ) : (
                        <ul className="app-units" aria-label="Seus pedidos">
                            {items.map((r) => (
                                <li key={r.id}>
                                    <Link className="app-link app-row-link" to={`/pedidos/${r.id}`}>
                                        {r.medication.displayName}
                                    </Link>
                                    <span className="app-status">{STATUS_TEXT[r.status]}</span>
                                    <span className="app-unit__fact--muted">
                                        Pedido em {formatDayTime(r.createdAt)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )
                }
            </Loaded>
        </>
    );
}
