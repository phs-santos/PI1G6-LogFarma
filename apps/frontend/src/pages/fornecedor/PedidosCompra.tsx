import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, Notice, TextField } from "@fatec-pi/style-guide";
import { listSupplierOrders, supplierAction } from "../../api/supplier";
import type { PurchaseOrderView, SupplierAction } from "../../api/types";
import { LIVE, qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { daysSince, todayIso } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { purchaseStatusText } from "../farmacia/Compras";
import "../farmacia/farmacia.css";

const OPEN = ["placed", "confirmed", "no_date"];

type Panel = { id: string; kind: "confirm" | "ship" } | null;

/** RF04/RF05: pedidos de compra recebidos pelo fornecedor. */
export function PedidosCompra() {
    const query = useQuery({
        queryKey: qk.supplier.purchaseOrders,
        queryFn: listSupplierOrders,
        refetchInterval: LIVE,
    });
    const [panel, setPanel] = useState<Panel>(null);
    const [done, setDone] = useState("");
    const act = useActionMutation(
        ({ id, body }: { id: string; body: SupplierAction }) => supplierAction(id, body),
        {
            invalidate: [qk.supplier.purchaseOrders],
            onSuccess: (_po, { body }) => {
                setPanel(null);
                setDone(
                    body.action === "confirm"
                        ? "Prazo confirmado. Os pacientes da fila foram avisados."
                        : body.action === "no_date"
                          ? "Registrado: ainda sem prazo."
                          : "Envio registrado. A unidade dá entrada quando receber.",
                );
            },
        },
    );
    const busy = (id: string) => act.isPending && act.variables?.id === id;

    const actions = (po: PurchaseOrderView): ReactNode => {
        if (!OPEN.includes(po.status)) return null;
        if (panel?.id === po.id && panel.kind === "confirm") {
            return (
                <ConfirmForm
                    pending={busy(po.id)}
                    onSubmit={(expectedAt) =>
                        act.run({ id: po.id, body: { action: "confirm", expectedAt } })
                    }
                    onCancel={() => setPanel(null)}
                />
            );
        }
        if (panel?.id === po.id && panel.kind === "ship") {
            return (
                <ShipForm
                    quantity={po.quantity}
                    pending={busy(po.id)}
                    onSubmit={(body) => act.run({ id: po.id, body })}
                    onCancel={() => setPanel(null)}
                />
            );
        }
        return (
            <div className="app-actions">
                <Button size="sm" onClick={() => setPanel({ id: po.id, kind: "confirm" })}>
                    Confirmar prazo
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    loading={busy(po.id)}
                    onClick={() => act.run({ id: po.id, body: { action: "no_date" } })}
                >
                    Ainda sem prazo
                </Button>
                <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPanel({ id: po.id, kind: "ship" })}
                >
                    Enviar
                </Button>
            </div>
        );
    };

    return (
        <>
            <h1>Pedidos de compra</h1>
            <div aria-live="polite">{done && <Notice tone="success" title={done} />}</div>
            {act.isError && (
                <Notice tone="danger" title="Não foi possível concluir.">
                    <p>{act.error.message}</p>
                </Notice>
            )}
            <Loaded query={query} what="os pedidos de compra">
                {(rows) => (
                    <DataTable
                        caption="Pedidos de compra"
                        rows={rows}
                        rowKey={(po) => po.id}
                        emptyText="Nenhum pedido de compra para vocês."
                        columns={[
                            {
                                key: "med",
                                header: "Remédio",
                                render: (po) => `${po.medication}, ${po.quantity} un.`,
                            },
                            { key: "unit", header: "Unidade", render: (po) => po.pharmacy.name },
                            {
                                key: "wait",
                                header: "Fila",
                                render: (po) =>
                                    po.waitingPatients === 1
                                        ? "1 paciente esperando"
                                        : `${po.waitingPatients} pacientes esperando`,
                            },
                            {
                                key: "age",
                                header: "Pedido",
                                render: (po) => {
                                    const days = daysSince(po.createdAt);
                                    return days === 0
                                        ? "Pedido hoje"
                                        : days === 1
                                          ? "Pedido há 1 dia"
                                          : `Pedido há ${days} dias`;
                                },
                            },
                            { key: "status", header: "Situação", render: purchaseStatusText },
                            { key: "actions", header: "Ações", render: actions },
                        ]}
                    />
                )}
            </Loaded>
        </>
    );
}

interface FormProps<T> {
    pending: boolean;
    onSubmit: (value: T) => void;
    onCancel: () => void;
}

function Shell(props: {
    label: string;
    submit: string;
    pending: boolean;
    error: string;
    onSubmit: () => void;
    onCancel: () => void;
    children: ReactNode;
}) {
    const submit = (e: FormEvent) => {
        e.preventDefault();
        props.onSubmit();
    };
    return (
        <form className="app-inline-form" aria-label={props.label} onSubmit={submit} noValidate>
            {props.children}
            {props.error && (
                <p className="sg-field__error" role="alert">
                    {props.error}
                </p>
            )}
            <div className="app-actions">
                <Button type="submit" loading={props.pending}>
                    {props.submit}
                </Button>
                <Button variant="ghost" onClick={props.onCancel}>
                    Cancelar
                </Button>
            </div>
        </form>
    );
}

function ConfirmForm({ pending, onSubmit, onCancel }: FormProps<string>) {
    const [date, setDate] = useState("");
    const [error, setError] = useState("");
    return (
        <Shell
            label="Confirmar prazo"
            submit="Confirmar data"
            pending={pending}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                if (!date) return setError("Escolha a data.");
                if (date < todayIso()) return setError("A data não pode ser no passado.");
                setError("");
                onSubmit(date);
            }}
        >
            <TextField
                label="Data prevista de entrega"
                type="date"
                min={todayIso()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
            />
        </Shell>
    );
}

function ShipForm({
    quantity,
    pending,
    onSubmit,
    onCancel,
}: FormProps<SupplierAction> & { quantity: number }) {
    const [f, setF] = useState({
        invoiceNumber: "",
        batchNumber: "",
        expiryDate: "",
        quantity: String(quantity),
    });
    const [error, setError] = useState("");
    return (
        <Shell
            label="Enviar"
            submit="Confirmar envio"
            pending={pending}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                const qty = Number(f.quantity);
                if (
                    !f.invoiceNumber.trim() ||
                    !f.batchNumber.trim() ||
                    !f.expiryDate ||
                    !Number.isInteger(qty) ||
                    qty < 1
                ) {
                    return setError("Preencha nota fiscal, lote, validade e quantidade.");
                }
                if (f.expiryDate <= todayIso())
                    return setError("A validade precisa ser uma data futura.");
                setError("");
                onSubmit({
                    action: "ship",
                    invoiceNumber: f.invoiceNumber.trim(),
                    batchNumber: f.batchNumber.trim(),
                    expiryDate: f.expiryDate,
                    quantity: qty,
                });
            }}
        >
            <TextField
                label="Nota fiscal"
                value={f.invoiceNumber}
                onChange={(e) => setF({ ...f, invoiceNumber: e.target.value })}
            />
            <TextField
                label="Lote"
                value={f.batchNumber}
                onChange={(e) => setF({ ...f, batchNumber: e.target.value })}
            />
            <TextField
                label="Validade"
                type="date"
                value={f.expiryDate}
                onChange={(e) => setF({ ...f, expiryDate: e.target.value })}
            />
            <TextField
                label="Quantidade enviada"
                inputMode="numeric"
                value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: e.target.value })}
            />
        </Shell>
    );
}
