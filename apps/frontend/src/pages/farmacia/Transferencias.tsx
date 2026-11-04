import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, Notice } from "@fatec-pi/style-guide";
import { listTransfers, transferAction } from "../../api/pharmacy";
import type { TransferAction, TransferView } from "../../api/types";
import { LIVE, qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { formatDate } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { InlineText } from "./InlineReason";
import { PharmacyTabs } from "./PharmacyTabs";
import "./farmacia.css";

function statusText(t: TransferView): string {
    switch (t.status) {
        case "requested":
            return "Aguardando envio";
        case "shipped":
            return "Enviado";
        case "received":
            return "Recebido";
        case "refused":
            return `Recusado: ${t.refusalReason ?? "sem motivo"}`;
    }
}

/** RF07: transferências entre unidades. */
export function Transferencias() {
    const incoming = useQuery({
        queryKey: qk.pharmacy.transfers("incoming"),
        queryFn: () => listTransfers("incoming"),
        refetchInterval: LIVE,
    });
    const outgoing = useQuery({
        queryKey: qk.pharmacy.transfers("outgoing"),
        queryFn: () => listTransfers("outgoing"),
        refetchInterval: LIVE,
    });
    const [refusing, setRefusing] = useState<string | null>(null);
    const act = useActionMutation(
        ({ id, body }: { id: string; body: TransferAction }) => transferAction(id, body),
        { invalidate: [qk.pharmacy.all], onSuccess: () => setRefusing(null) },
    );
    const busy = (id: string) => act.isPending && act.variables?.id === id;

    const columns = (mine: boolean) => [
        {
            key: "med",
            header: "Remédio",
            render: (t: TransferView) => `${t.medication}, ${t.quantity} un.`,
        },
        {
            key: "unit",
            header: mine ? "Pedimos à" : "Pedido da",
            render: (t: TransferView) => (mine ? t.to.name : t.from.name),
        },
        {
            key: "batch",
            header: "Lote",
            render: (t: TransferView) => `${t.batchNumber}, vence ${formatDate(t.expiryDate)}`,
        },
        { key: "status", header: "Situação", render: statusText },
        {
            key: "actions",
            header: "Ações",
            render: (t: TransferView) =>
                mine ? (
                    t.status === "shipped" && (
                        <Button
                            loading={busy(t.id)}
                            onClick={() => act.run({ id: t.id, body: { action: "receive" } })}
                        >
                            Recebido
                        </Button>
                    )
                ) : t.status === "requested" ? (
                    refusing === t.id ? (
                        <InlineText
                            label="Motivo da recusa"
                            submit="Confirmar recusa"
                            required="Escreva o motivo da recusa."
                            pending={busy(t.id)}
                            onSubmit={(reason) =>
                                act.run({ id: t.id, body: { action: "refuse", reason } })
                            }
                            onCancel={() => setRefusing(null)}
                        />
                    ) : (
                        <div className="app-actions">
                            <Button
                                loading={busy(t.id)}
                                onClick={() => act.run({ id: t.id, body: { action: "ship" } })}
                            >
                                Enviar
                            </Button>
                            <Button variant="secondary" onClick={() => setRefusing(t.id)}>
                                Recusar
                            </Button>
                        </div>
                    )
                ) : null,
        },
    ];

    return (
        <>
            <PharmacyTabs />
            <h1>Transferências</h1>
            {act.isError && (
                <Notice tone="danger" title="Não foi possível concluir.">
                    <p>{act.error.message}</p>
                </Notice>
            )}
            <div className="app-stack">
                <Loaded query={incoming} what="os pedidos de outras unidades">
                    {(rows) => (
                        <DataTable
                            caption="Pedidos para nós"
                            columns={columns(false)}
                            rows={rows}
                            rowKey={(t) => t.id}
                            emptyText="Nenhuma unidade pediu remédio para nós."
                        />
                    )}
                </Loaded>
                <Loaded query={outgoing} what="os nossos pedidos">
                    {(rows) => (
                        <DataTable
                            caption="Nossos pedidos"
                            columns={columns(true)}
                            rows={rows}
                            rowKey={(t) => t.id}
                            emptyText="Não pedimos remédio a outras unidades."
                        />
                    )}
                </Loaded>
            </div>
        </>
    );
}
