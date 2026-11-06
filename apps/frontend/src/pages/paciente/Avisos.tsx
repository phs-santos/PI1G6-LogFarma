import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, PageHeader } from "@fatec-pi/style-guide";
import { listNotifications, markNotificationRead } from "../../api/notifications";
import type { NotificationView } from "../../api/types";
import { LIVE, qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { formatAgo } from "../../lib/format";
import { Loaded } from "../../ui/Loaded";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

/** RF05: avisos; os novos marcados com a palavra "Novo" (não só com cor). */
export function Avisos() {
    usePageTitle("Avisos");
    const navigate = useNavigate();
    const query = useQuery({
        queryKey: qk.notifications(false),
        queryFn: () => listNotifications(false),
        refetchInterval: LIVE,
    });
    const read = useActionMutation((n: NotificationView) => markNotificationRead(n.id), {
        invalidate: [qk.notifications(true), qk.notifications(false)],
    });
    const open = async (n: NotificationView) => {
        if (!n.readAt) await read.mutateAsync(n).catch(() => undefined);
        if (n.requestId) navigate(`/pedidos/${n.requestId}`);
    };

    return (
        <>
            <PageHeader title="Avisos" />
            <Loaded query={query} what="seus avisos">
                {(items) =>
                    items.length === 0 ? (
                        <EmptyState title="Nenhum aviso por enquanto.">
                            <p>Quando seu pedido mudar, o aviso aparece aqui.</p>
                        </EmptyState>
                    ) : (
                        <ul className="app-notices" aria-label="Seus avisos">
                            {items.map((n) => (
                                <li key={n.id}>
                                    <button
                                        type="button"
                                        className={`app-notice${n.readAt ? "" : " app-notice--new"}`}
                                        onClick={() => void open(n)}
                                    >
                                        {!n.readAt && <span className="app-notice__new">Novo</span>}
                                        <span className="app-notice__title">{n.title}</span>
                                        {n.body && <span>{n.body}</span>}
                                        <span className="app-unit__fact--muted">
                                            {formatAgo(n.createdAt)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )
                }
            </Loaded>
        </>
    );
}
