import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, DataTable, Notice, SelectField, Stamp, TextField } from "@fatec-pi/style-guide";
import { addBatch, adjustBatch, listUnitStock, setMinQuantity } from "../../api/pharmacy";
import type { NewBatchInput, UnitStockItem } from "../../api/types";
import { qk, REGULAR } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { daysUntil, formatDate } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { LinkButton } from "../../ui/LinkButton";
import { InlineText } from "../../ui/InlineText";
import { PharmacyTabs } from "./PharmacyTabs";
import "./farmacia.css";

const EXPIRY_WARNING_DAYS = 60;

function ExpiryStamp({ expiryDate }: { expiryDate: string }) {
    const days = daysUntil(expiryDate);
    if (days < 0) return <Stamp tone="danger">Vencido</Stamp>;
    if (days > EXPIRY_WARNING_DAYS) return null;
    return (
        <Stamp tone="danger">
            {days === 0 ? "Vence hoje" : days === 1 ? "Vence amanhã" : `Vence em ${days} dias`}
        </Stamp>
    );
}

type Panel = { kind: "min"; medicationId: string } | { kind: "loss"; batchId: string } | null;

/** Estoque da unidade: por remédio, com lotes, validade, reservado e mínimo. */
export function Estoque() {
    const query = useQuery({
        queryKey: qk.pharmacy.stock,
        queryFn: listUnitStock,
        refetchInterval: REGULAR,
    });
    const [panel, setPanel] = useState<Panel>(null);
    const [adding, setAdding] = useState(false);
    const [done, setDone] = useState("");
    const finish = (message: string) => () => {
        setPanel(null);
        setAdding(false);
        setDone(message);
    };
    const invalidate = [qk.pharmacy.all];
    const min = useActionMutation(
        ({ medicationId, value }: { medicationId: string; value: number }) =>
            setMinQuantity(medicationId, value),
        { invalidate, onSuccess: finish("Mínimo atualizado.") },
    );
    const loss = useActionMutation(
        ({ batchId, quantity }: { batchId: string; quantity: number }) =>
            adjustBatch(batchId, { delta: -quantity, reason: "exit_loss" }),
        { invalidate, onSuccess: finish("Perda registrada.") },
    );
    const add = useActionMutation(addBatch, { invalidate, onSuccess: finish("Lote registrado.") });
    const error = min.error ?? loss.error ?? add.error;

    return (
        <>
            <PharmacyTabs />
            <div className="app-toolbar">
                <h1>Estoque</h1>
                <div className="app-actions">
                    <Button variant="secondary" onClick={() => setAdding(true)}>
                        Dar entrada em lote
                    </Button>
                    <LinkButton
                        to="/farmacia/estoque/novo-medicamento"
                        variant="secondary"
                        size="md"
                        block={false}
                    >
                        Cadastrar medicamento
                    </LinkButton>
                </div>
            </div>
            <div aria-live="polite">{done && <Notice tone="success" title={done} />}</div>
            {error && (
                <Notice tone="danger" title="Não foi possível concluir.">
                    <p>{error.message}</p>
                </Notice>
            )}
            <Loaded query={query} what="o estoque">
                {(rows) => (
                    <>
                        {adding && (
                            <NewBatchForm
                                items={rows}
                                pending={add.isPending}
                                onSubmit={(input) => add.run(input)}
                                onCancel={() => setAdding(false)}
                            />
                        )}
                        <DataTable
                            caption="Estoque da unidade"
                            rows={rows}
                            rowKey={(s) => s.medication.id}
                            emptyText="Nenhum remédio no estoque desta unidade."
                            columns={[
                                {
                                    key: "med",
                                    header: "Remédio",
                                    render: (s) => s.medication.displayName,
                                },
                                {
                                    key: "avail",
                                    header: "Disponível",
                                    render: (s) => (
                                        <>
                                            {s.available}
                                            {s.available <= s.minQuantity && (
                                                <span className="app-block app-alert-text">
                                                    Abaixo do mínimo
                                                </span>
                                            )}
                                        </>
                                    ),
                                },
                                { key: "res", header: "Reservado", render: (s) => s.reserved },
                                {
                                    key: "min",
                                    header: "Mínimo",
                                    render: (s) =>
                                        panel?.kind === "min" &&
                                        panel.medicationId === s.medication.id ? (
                                            <InlineText
                                                label="Novo mínimo"
                                                submit="Salvar mínimo"
                                                required="Informe um número."
                                                inputMode="numeric"
                                                initial={String(s.minQuantity)}
                                                pending={min.isPending}
                                                onSubmit={(v) => {
                                                    const value = Number(v);
                                                    if (Number.isInteger(value) && value >= 0)
                                                        min.run({
                                                            medicationId: s.medication.id,
                                                            value,
                                                        });
                                                }}
                                                onCancel={() => setPanel(null)}
                                            />
                                        ) : (
                                            <>
                                                {s.minQuantity}{" "}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label={`Mudar mínimo de ${s.medication.displayName}`}
                                                    onClick={() =>
                                                        setPanel({
                                                            kind: "min",
                                                            medicationId: s.medication.id,
                                                        })
                                                    }
                                                >
                                                    Mudar mínimo
                                                </Button>
                                            </>
                                        ),
                                },
                                {
                                    key: "batches",
                                    header: "Lotes",
                                    render: (s) =>
                                        s.batches.length === 0 ? (
                                            "Sem lotes"
                                        ) : (
                                            <ul className="app-batches">
                                                {s.batches.map((b) => (
                                                    <li key={b.id}>
                                                        <span>
                                                            {b.batchNumber}: {b.quantity} un., vence{" "}
                                                            {formatDate(b.expiryDate)}
                                                        </span>{" "}
                                                        <ExpiryStamp expiryDate={b.expiryDate} />
                                                        {panel?.kind === "loss" &&
                                                        panel.batchId === b.id ? (
                                                            <InlineText
                                                                label="Quantidade perdida"
                                                                submit="Baixar perda"
                                                                required="Informe a quantidade."
                                                                inputMode="numeric"
                                                                pending={loss.isPending}
                                                                onSubmit={(v) => {
                                                                    const quantity = Number(v);
                                                                    if (
                                                                        Number.isInteger(
                                                                            quantity,
                                                                        ) &&
                                                                        quantity > 0
                                                                    )
                                                                        loss.run({
                                                                            batchId: b.id,
                                                                            quantity,
                                                                        });
                                                                }}
                                                                onCancel={() => setPanel(null)}
                                                            />
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                aria-label={`Baixar perda do lote ${b.batchNumber}`}
                                                                onClick={() =>
                                                                    setPanel({
                                                                        kind: "loss",
                                                                        batchId: b.id,
                                                                    })
                                                                }
                                                            >
                                                                Baixar perda
                                                            </Button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ),
                                },
                            ]}
                        />
                    </>
                )}
            </Loaded>
        </>
    );
}

function NewBatchForm(props: {
    items: UnitStockItem[];
    pending: boolean;
    onSubmit: (input: NewBatchInput) => void;
    onCancel: () => void;
}) {
    const [f, setF] = useState({ medicationId: "", batchNumber: "", expiryDate: "", quantity: "" });
    const [error, setError] = useState("");
    const submit = (e: FormEvent) => {
        e.preventDefault();
        const quantity = Number(f.quantity);
        if (
            !f.medicationId ||
            !f.batchNumber.trim() ||
            !f.expiryDate ||
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            return setError("Preencha remédio, lote, validade e quantidade.");
        }
        setError("");
        props.onSubmit({
            medicationId: f.medicationId,
            batchNumber: f.batchNumber.trim(),
            expiryDate: f.expiryDate,
            quantity,
        });
    };
    return (
        <form
            className="app-inline-form"
            onSubmit={submit}
            noValidate
            aria-label="Dar entrada em lote"
        >
            <h2>Dar entrada em lote</h2>
            <SelectField
                label="Remédio"
                value={f.medicationId}
                onChange={(e) => setF({ ...f, medicationId: e.target.value })}
                options={[
                    { value: "", label: "Escolha o remédio" },
                    ...props.items.map((s) => ({
                        value: s.medication.id,
                        label: s.medication.displayName,
                    })),
                ]}
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
                label="Quantidade"
                inputMode="numeric"
                value={f.quantity}
                onChange={(e) => setF({ ...f, quantity: e.target.value })}
            />
            {error && (
                <p className="sg-field__error" role="alert">
                    {error}
                </p>
            )}
            <div className="app-actions">
                <Button type="submit" loading={props.pending}>
                    Registrar lote
                </Button>
                <Button variant="ghost" onClick={props.onCancel}>
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
