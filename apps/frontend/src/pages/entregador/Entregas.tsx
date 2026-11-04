import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, EmptyState, Notice, Stamp, Tabs } from "@fatec-pi/style-guide";
import { courierAction, listCourierDeliveries } from "../../api/courier";
import type { DeliveryView } from "../../api/types";
import { LIVE, qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { Loaded } from "../../ui/Loaded";
import { DELIVERY_STATUS } from "./texts";
import "../paciente/paciente.css";

/** RF08: entregas disponíveis (sem dados da paciente) e as minhas. */
export function EntregasEntregador() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const tab = params.get("aba") === "minhas" ? "minhas" : "disponiveis";
    const available = useQuery({
        queryKey: qk.courier.deliveries("available"),
        queryFn: () => listCourierDeliveries("available"),
        refetchInterval: LIVE,
    });
    const mine = useQuery({
        queryKey: qk.courier.deliveries("mine"),
        queryFn: () => listCourierDeliveries("mine"),
        refetchInterval: LIVE,
    });
    const accept = useActionMutation((id: string) => courierAction(id, { action: "accept" }), {
        invalidate: [["courier"]],
        onSuccess: (d) => navigate(`/entregas/${d.id}`),
    });
    const open = (mine.data ?? []).filter(
        (d) => d.status === "scheduled" || d.status === "out_for_delivery",
    );

    return (
        <>
            <h1>Entregas</h1>
            <Tabs
                label="Entregas"
                activeId={tab}
                onSelect={(id) =>
                    setParams(id === "minhas" ? { aba: "minhas" } : {}, { replace: true })
                }
                items={[
                    { id: "disponiveis", label: "Disponíveis", count: available.data?.length },
                    { id: "minhas", label: "Minhas", count: open.length },
                ]}
            />
            {accept.isError && (
                <Notice tone="danger" title="Não foi possível aceitar.">
                    <p>{accept.error.message}</p>
                </Notice>
            )}
            {tab === "disponiveis" ? (
                <Loaded query={available} what="as entregas disponíveis">
                    {(items) =>
                        items.length === 0 ? (
                            <EmptyState title="Nenhuma entrega disponível agora." />
                        ) : (
                            <ul className="app-units" aria-label="Entregas disponíveis">
                                {items.map((d) => (
                                    <li key={d.id}>
                                        <strong>{d.area}</strong>
                                        <span>Retirar na {d.pharmacy.name}</span>
                                        <span>{d.scheduledWindow}</span>
                                        {d.requiresRefrigeration && (
                                            <Stamp tone="neutral">Refrigerado</Stamp>
                                        )}
                                        <Button
                                            block
                                            loading={accept.isPending && accept.variables === d.id}
                                            disabled={accept.isPending}
                                            onClick={() => accept.run(d.id)}
                                        >
                                            Aceitar entrega
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )
                    }
                </Loaded>
            ) : (
                <Loaded query={mine} what="suas entregas">
                    {(items) =>
                        items.length === 0 ? (
                            <EmptyState title="Você ainda não aceitou nenhuma entrega." />
                        ) : (
                            <ul className="app-units" aria-label="Minhas entregas">
                                {items.map((d: DeliveryView) => (
                                    <li key={d.id}>
                                        <Link
                                            className="app-link app-row-link"
                                            to={`/entregas/${d.id}`}
                                        >
                                            {d.recipient?.name ?? d.area}
                                        </Link>
                                        <span>{d.recipient?.address ?? d.area}</span>
                                        <span className="app-status">
                                            {DELIVERY_STATUS[d.status]}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )
                    }
                </Loaded>
            )}
        </>
    );
}
