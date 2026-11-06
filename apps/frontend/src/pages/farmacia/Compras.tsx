import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, Notice, PageHeader } from "@fatec-pi/style-guide";
import {
    listPharmacyPurchaseOrders,
    listUnitStock,
    listWaitlist,
    receivePurchaseOrder,
} from "../../api/pharmacy";
import type { PurchaseOrderView, WaitlistItem } from "../../api/types";
import { qk, REGULAR } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { formatDate, formatDayMonth } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { PRIORITY_TEXT } from "../paciente/profileText";
import "./farmacia.css";
import { usePageTitle } from "../../app/usePageTitle";

export function purchaseStatusText(po: PurchaseOrderView): string {
    switch (po.status) {
        case "placed":
            return "Pedido feito, aguardando o fornecedor";
        case "confirmed":
            return po.expectedAt
                ? `Prazo confirmado: ${formatDayMonth(po.expectedAt)}`
                : "Prazo confirmado";
        case "no_date":
            return "Fornecedor ainda sem prazo";
        case "shipped":
            return "Enviado pelo fornecedor";
        case "received":
            return "Recebido";
    }
}

/** RF04/RF06: compras ao fornecedor e a fila de espera de cada remédio. */
export function Compras() {
    usePageTitle("Compras");
    const orders = useQuery({
        queryKey: qk.pharmacy.purchaseOrders,
        queryFn: listPharmacyPurchaseOrders,
        refetchInterval: REGULAR,
    });
    const stock = useQuery({ queryKey: qk.pharmacy.stock, queryFn: listUnitStock });
    const [queueOf, setQueueOf] = useState<{ medicationId: string; name: string } | null>(null);
    const receive = useActionMutation(receivePurchaseOrder, { invalidate: [qk.pharmacy.all] });
    // A compra traz só o nome do remédio; o id (para a fila) vem do estoque da unidade.
    const idOf = (name: string) =>
        stock.data?.find((s) => s.medication.displayName === name)?.medication.id;

    return (
        <>
            <PageHeader title="Compras" />
            {receive.isError && (
                <Notice tone="danger" title="Não foi possível dar entrada.">
                    <p>{receive.error.message}</p>
                </Notice>
            )}
            <div className="app-stack">
                <Loaded query={orders} what="as compras">
                    {(rows) => (
                        <DataTable
                            caption="Pedidos de compra"
                            rows={rows}
                            rowKey={(po) => po.id}
                            emptyText="Nenhum pedido de compra."
                            columns={[
                                {
                                    key: "med",
                                    header: "Remédio",
                                    render: (po) => (
                                        <>
                                            {po.medication}, {po.quantity} un.
                                            {po.origin === "auto_min_stock" && (
                                                <span className="app-block app-queue__meta">
                                                    Reposição automática (estoque abaixo do mínimo)
                                                </span>
                                            )}
                                        </>
                                    ),
                                },
                                {
                                    key: "supplier",
                                    header: "Fornecedor",
                                    render: (po) => po.supplier.name,
                                },
                                { key: "status", header: "Situação", render: purchaseStatusText },
                                {
                                    key: "shipped",
                                    header: "Lote enviado",
                                    render: (po) =>
                                        po.shippedBatchNumber
                                            ? `${po.shippedBatchNumber}, ${po.shippedQuantity ?? 0} un., vence ${formatDate(po.shippedExpiryDate ?? "")}, nota ${po.invoiceNumber ?? ""}`
                                            : "—",
                                },
                                {
                                    key: "waiting",
                                    header: "Na fila",
                                    render: (po) => {
                                        const id = idOf(po.medication);
                                        return (
                                            <>
                                                {po.waitingPatients} pacientes
                                                {id && po.waitingPatients > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        aria-label={`Ver fila de ${po.medication}`}
                                                        onClick={() =>
                                                            setQueueOf({
                                                                medicationId: id,
                                                                name: po.medication,
                                                            })
                                                        }
                                                    >
                                                        Ver fila
                                                    </Button>
                                                )}
                                            </>
                                        );
                                    },
                                },
                                {
                                    key: "actions",
                                    header: "Ações",
                                    render: (po) =>
                                        po.status === "shipped" && (
                                            <Button
                                                loading={
                                                    receive.isPending && receive.variables === po.id
                                                }
                                                onClick={() => receive.run(po.id)}
                                            >
                                                Dar entrada
                                            </Button>
                                        ),
                                },
                            ]}
                        />
                    )}
                </Loaded>
                {queueOf && <Waitlist medicationId={queueOf.medicationId} name={queueOf.name} />}
            </div>
        </>
    );
}

const AGE: Record<NonNullable<WaitlistItem["ageGroup"]>, string> = {
    "80+": "80 anos ou mais",
    "60+": "60 anos ou mais",
};

function Waitlist({ medicationId, name }: { medicationId: string; name: string }) {
    const query = useQuery({
        queryKey: qk.pharmacy.waitlist(medicationId),
        queryFn: () => listWaitlist(medicationId),
        refetchInterval: REGULAR,
    });
    return (
        <Loaded query={query} what="a fila de espera">
            {(rows) => (
                <DataTable
                    caption={`Fila de espera: ${name}`}
                    rows={rows}
                    rowKey={(w) => w.requestId}
                    emptyText="Ninguém na fila."
                    columns={[
                        { key: "pos", header: "Posição", render: (w) => `${w.position}º` },
                        { key: "name", header: "Paciente", render: (w) => w.patientName },
                        {
                            key: "cat",
                            header: "Prioridade",
                            render: (w) =>
                                w.category ? PRIORITY_TEXT[w.category] : "Sem prioridade declarada",
                        },
                        {
                            key: "age",
                            header: "Idade",
                            render: (w) => (w.ageGroup ? AGE[w.ageGroup] : "Menos de 60 anos"),
                        },
                        { key: "qty", header: "Quantidade", render: (w) => `${w.quantity} un.` },
                    ]}
                />
            )}
        </Loaded>
    );
}
