import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
    EmptyState,
    FilterBar,
    ListDetail,
    PageHeader,
    SelectField,
    TextField,
} from "@fatec-pi/style-guide";
import { listPharmacyRequests } from "../../api/pharmacy";
import { LIVE, qk } from "../../app/queryKeys";
import { formatDayTime } from "../../lib/dates";
import { normalizeText } from "../../lib/text";
import { Loaded } from "../../ui/Loaded";
import { PedidoDetalhe } from "./PedidoDetalhe";
import { OPEN_STATUSES, STAFF_STATUS } from "./texts";
import "./farmacia.css";
import { usePageTitle } from "../../app/usePageTitle";

/** Balcão: fila de pedidos à esquerda, pedido aberto com o próximo passo à direita. */
export function Pedidos() {
    usePageTitle("Pedidos");
    const { id } = useParams();
    const [filter, setFilter] = useState<"open" | "all">("open");
    const [text, setText] = useState("");
    const query = useQuery({
        queryKey: qk.pharmacy.requests(),
        queryFn: () => listPharmacyRequests(),
        refetchInterval: LIVE,
    });

    return (
        <>
            <PageHeader title="Pedidos" />
            <Loaded query={query} what="os pedidos">
                {(all) => {
                    const q = normalizeText(text);
                    const items = all.filter(
                        (i) =>
                            (filter === "all" || OPEN_STATUSES.includes(i.request.status)) &&
                            (!q ||
                                normalizeText(
                                    `${i.request.medication.displayName} ${i.patient.name}`,
                                ).includes(q)),
                    );
                    const selected = all.find((i) => i.request.id === id);
                    return (
                        <>
                            <FilterBar
                                label="Filtrar pedidos"
                                summary={
                                    items.length === 1 ? "1 pedido" : `${items.length} pedidos`
                                }
                                active={Boolean(text || filter !== "open")}
                                onClear={() => {
                                    setText("");
                                    setFilter("open");
                                }}
                            >
                                <TextField
                                    label="Buscar"
                                    type="search"
                                    placeholder="Remédio ou paciente"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                                <SelectField
                                    label="Mostrar"
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value as "open" | "all")}
                                    options={[
                                        { value: "open", label: "Em andamento" },
                                        { value: "all", label: "Todos, inclusive finalizados" },
                                    ]}
                                />
                            </FilterBar>
                            <ListDetail
                                listLabel="Fila de pedidos"
                                list={
                                    <>
                                        {items.length === 0 ? (
                                            <EmptyState
                                                title={
                                                    text
                                                        ? "Nenhum pedido com esse nome."
                                                        : "Nenhum pedido em andamento."
                                                }
                                            />
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
                                                                {r.medication.displayName},{" "}
                                                                {r.quantity} un.
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
                                            <PedidoDetalhe
                                                key={selected.request.id}
                                                item={selected}
                                            />
                                        ) : (
                                            <EmptyState title="Escolha um pedido na fila." />
                                        )}
                                    </section>
                                }
                            />
                        </>
                    );
                }}
            </Loaded>
        </>
    );
}
