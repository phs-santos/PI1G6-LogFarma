import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ListDetail, SelectField } from "@fatec-pi/style-guide";
import { listPharmacyRequests } from "../../api/pharmacy";
import { LIVE, qk } from "../../app/queryKeys";
import { formatDayTime } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { PedidoDetalhe } from "./PedidoDetalhe";
import { PharmacyTabs } from "./PharmacyTabs";
import { OPEN_STATUSES, STAFF_STATUS } from "./texts";
import "./farmacia.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Balcão: fila de pedidos à esquerda, pedido aberto com o próximo passo à direita. */
export function Pedidos() {
    usePageTitle("Pedidos");
    const { id } = useParams();
    const [filter, setFilter] = useState<"open" | "all">("open");
    const query = useQuery({
        queryKey: qk.pharmacy.requests(),
        queryFn: () => listPharmacyRequests(),
        refetchInterval: LIVE,
    });

    return (
        <>
            <PharmacyTabs />
            <h1>Pedidos</h1>
            <Loaded query={query} what="os pedidos">
                {(all) => {
                    const items =
                        filter === "open"
                            ? all.filter((i) => OPEN_STATUSES.includes(i.request.status))
                            : all;
                    const selected = all.find((i) => i.request.id === id);
                    return (
                        <ListDetail
                            listLabel="Fila de pedidos"
                            list={
                                <>
                                    <SelectField
                                        label="Mostrar"
                                        value={filter}
                                        onChange={(e) =>
                                            setFilter(e.target.value as "open" | "all")
                                        }
                                        options={[
                                            { value: "open", label: "Em andamento" },
                                            { value: "all", label: "Todos, inclusive finalizados" },
                                        ]}
                                    />
                                    {items.length === 0 ? (
                                        <EmptyState title="Nenhum pedido em andamento." />
                                    ) : (
                                        <ul className="app-queue">
                                            {items.map(({ request: r, patient }) => (
                                                <li key={r.id}>
                                                    <Link
                                                        className="app-queue__item"
                                                        to={`/farmacia/pedidos/${r.id}`}
                                                        aria-current={
                                                            r.id === id ? "page" : undefined
                                                        }
                                                    >
                                                        <span className="app-queue__title">
                                                            {r.medication.displayName}, {r.quantity}{" "}
                                                            un.
                                                        </span>
                                                        <span>
                                                            {patient.name}:{" "}
                                                            {r.fulfillment === "delivery"
                                                                ? "entrega em casa"
                                                                : "retirada"}
                                                        </span>
                                                        <span className="app-queue__meta">
                                                            {STAFF_STATUS[r.status]}, desde{" "}
                                                            {formatDayTime(r.updatedAt)}
                                                        </span>
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            }
                            detail={
                                <section aria-label="Pedido aberto">
                                    {selected ? (
                                        <PedidoDetalhe key={selected.request.id} item={selected} />
                                    ) : (
                                        <EmptyState title="Escolha um pedido na fila." />
                                    )}
                                </section>
                            }
                        />
                    );
                }}
            </Loaded>
        </>
    );
}
