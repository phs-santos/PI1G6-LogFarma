import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Notice, SelectField, Stamp, Tarja, TextField } from "@fatec-pi/style-guide";
import {
    attachPrescription,
    checkPrescription,
    counterAction,
    getNetworkAvailability,
    listPharmacyPurchaseOrders,
    listSuppliers,
    listUnitStock,
} from "../../api/pharmacy";
import type { CounterAction, PharmacyRequestItem, PrescriptionInput } from "../../api/types";
import { qk, REGULAR } from "../../app/queryKeys";
import { useSession } from "../../app/session";
import { useActionMutation } from "../../app/useActionMutation";
import { formatDate } from "../../lib/dates";
import { formatCns, formatPhone, joinUnits } from "../../lib/format";
import { Choice, Choices } from "../../ui/Choices";
import {
    cleanPrescription,
    EMPTY_PRESCRIPTION,
    PrescriptionFields,
    prescriptionProblem,
} from "../../ui/PrescriptionFields";
import { nextStep, type ActionKey } from "./nextStep";
import { STAFF_STATUS } from "./texts";

const FORM_ACTIONS: ActionKey[] = [
    "register_prescription",
    "dispense",
    "schedule_delivery",
    "order_from_supplier",
];

/** Pedido aberto: quem é, o que pediu, o que a unidade e a rede têm, e o próximo passo. */
export function PedidoDetalhe({ item }: { item: PharmacyRequestItem }) {
    const r = item.request;
    const { profile } = useSession();
    const occupation =
        profile?.kind === "pharmacy_staff" ? profile.occupation : "pharmacy_assistant";
    const stock = useQuery({
        queryKey: qk.pharmacy.stock,
        queryFn: listUnitStock,
        refetchInterval: REGULAR,
    });
    const network = useQuery({
        queryKey: qk.pharmacy.network(r.medication.id),
        queryFn: () => getNetworkAvailability(r.medication.id),
        refetchInterval: REGULAR,
    });
    const own = stock.data?.find((s) => s.medication.id === r.medication.id)?.available ?? 0;
    const step = nextStep(item, network.data ?? [], occupation, own);
    const [form, setForm] = useState<ActionKey | null>(null);
    const [done, setDone] = useState("");

    const after = (message: string) => () => {
        setForm(null);
        setDone(message);
    };
    const invalidate = [qk.pharmacy.all];
    const act = useActionMutation((body: CounterAction) => counterAction(r.id, body), {
        invalidate,
        onSuccess: after("Pronto, pedido atualizado."),
    });
    const check = useActionMutation((rxId: string) => checkPrescription(rxId), {
        invalidate,
        onSuccess: after("Receita conferida."),
    });
    const register = useActionMutation((rx: PrescriptionInput) => attachPrescription(r.id, rx), {
        invalidate,
        onSuccess: after("Receita registrada. Agora confira os dados."),
    });
    const pending = act.isPending || check.isPending || register.isPending;
    const error = act.error ?? check.error ?? register.error;

    const label = (a: ActionKey): string => {
        switch (a) {
            case "register_prescription":
                return "Registrar receita";
            case "check_prescription":
                return "Conferir receita";
            case "prepare":
                return "Separar";
            case "dispense":
                return "Entregar no balcão";
            case "schedule_delivery":
                return "Agendar entrega";
            case "request_transfer":
                return step.transferFrom
                    ? `Pedir à ${step.transferFrom.pharmacyName}`
                    : "Pedir a outra unidade";
            case "order_from_supplier":
                return "Pedir ao fornecedor";
        }
    };
    const start = (a: ActionKey) => {
        setDone("");
        if (FORM_ACTIONS.includes(a)) return setForm(a);
        if (a === "check_prescription" && r.prescription) return check.run(r.prescription.id);
        if (a === "prepare") return act.run({ action: "prepare" });
        if (a === "request_transfer" && step.transferFrom) {
            return act.run({
                action: "request_transfer",
                fromPharmacyId: step.transferFrom.pharmacyId,
            });
        }
    };

    const rx = r.prescription;
    const others = network.data ?? [];
    return (
        <div className="app-detail">
            <div>
                <h2>{r.medication.displayName}</h2>
                <p>
                    {r.quantity} unidades,{" "}
                    {r.fulfillment === "delivery" ? "entrega em casa" : "retirada no balcão"}
                </p>
                <Tarja type={r.medication.prescriptionType} />
            </div>
            <Stamp tone="neutral">{STAFF_STATUS[r.status]}</Stamp>

            <div aria-live="polite">{done && <Notice tone="success" title={done} />}</div>
            {error && (
                <Notice tone="danger" title="Não foi possível concluir.">
                    <p>{error.message}</p>
                </Notice>
            )}

            <div className="app-actions">
                {step.primary && (
                    <Button size="lg" loading={pending} onClick={() => start(step.primary!)}>
                        {label(step.primary)}
                    </Button>
                )}
                {step.others.map((a) => (
                    <Button key={a} variant="secondary" disabled={pending} onClick={() => start(a)}>
                        {label(a)}
                    </Button>
                ))}
                {step.blocked && <span className="app-blocked">{step.blocked}</span>}
            </div>

            {form === "register_prescription" && (
                <RegisterPrescriptionForm
                    onSubmit={(v) => register.run(v)}
                    pending={register.isPending}
                    onCancel={() => setForm(null)}
                />
            )}
            {form === "dispense" && (
                <DispenseForm
                    item={item}
                    pending={act.isPending}
                    onSubmit={(b) => act.run(b)}
                    onCancel={() => setForm(null)}
                />
            )}
            {form === "schedule_delivery" && (
                <ScheduleForm
                    pending={act.isPending}
                    onSubmit={(b) => act.run(b)}
                    onCancel={() => setForm(null)}
                />
            )}
            {form === "order_from_supplier" && (
                <SupplierForm
                    item={item}
                    pending={act.isPending}
                    onSubmit={(b) => act.run(b)}
                    onCancel={() => setForm(null)}
                />
            )}

            <section aria-labelledby="det-paciente">
                <h3 id="det-paciente">Paciente</h3>
                <dl>
                    <dt>Nome</dt>
                    <dd>{item.patient.name}</dd>
                    <dt>Idade</dt>
                    <dd>{item.patient.age} anos</dd>
                    <dt>Cartão SUS</dt>
                    <dd>{formatCns(item.patient.cns)}</dd>
                    <dt>Telefone</dt>
                    <dd>{formatPhone(item.patient.phone)}</dd>
                    {r.fulfillment === "delivery" && item.patient.address && (
                        <>
                            <dt>Endereço</dt>
                            <dd>{item.patient.address}</dd>
                        </>
                    )}
                    <dt>Podem retirar</dt>
                    <dd>
                        {item.patient.caregivers.length === 0
                            ? "Só o paciente"
                            : item.patient.caregivers.map((c) => (
                                  <span key={c.id} className="app-block">
                                      {c.fullName} ({c.relationship})
                                  </span>
                              ))}
                    </dd>
                </dl>
            </section>

            <section aria-labelledby="det-receita">
                <h3 id="det-receita">Receita</h3>
                {r.medication.prescriptionType === "none" ? (
                    <p>Não precisa de receita.</p>
                ) : rx ? (
                    <p>
                        {rx.prescriberName}, de {formatDate(rx.issuedAt)}, vale até{" "}
                        {formatDate(rx.validUntil)}.{" "}
                        <Stamp tone={rx.checked ? "ok" : "danger"}>
                            {rx.checked ? "Conferida" : "Não conferida"}
                        </Stamp>
                    </p>
                ) : (
                    <p>Sem receita registrada. Peça a receita em papel e registre os dados.</p>
                )}
            </section>

            <section aria-labelledby="det-estoque">
                <h3 id="det-estoque">Estoque</h3>
                <p>Nesta unidade: {stock.isPending ? "carregando…" : `${own} disponíveis`}</p>
                <p>
                    {network.isPending
                        ? "Consultando a rede…"
                        : others.length === 0
                          ? "Nenhuma outra unidade da rede tem este remédio."
                          : `Tem ${joinUnits(others.map((n) => `na ${n.pharmacyName} (${n.available})`))}`}
                </p>
            </section>
        </div>
    );
}

interface FormProps<T> {
    pending: boolean;
    onSubmit: (value: T) => void;
    onCancel: () => void;
}

function FormShell(props: {
    title: string;
    submit: string;
    pending: boolean;
    error?: string;
    onSubmit: () => void;
    onCancel: () => void;
    children: React.ReactNode;
}) {
    const submit = (e: FormEvent) => {
        e.preventDefault();
        props.onSubmit();
    };
    return (
        <form className="app-inline-form" onSubmit={submit} noValidate aria-label={props.title}>
            <h3>{props.title}</h3>
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

function RegisterPrescriptionForm({ pending, onSubmit, onCancel }: FormProps<PrescriptionInput>) {
    const [rx, setRx] = useState<PrescriptionInput>(EMPTY_PRESCRIPTION);
    const [error, setError] = useState("");
    return (
        <FormShell
            title="Registrar receita"
            submit="Salvar receita"
            pending={pending}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                const problem = prescriptionProblem(rx);
                setError(problem);
                if (!problem) onSubmit(cleanPrescription(rx));
            }}
        >
            <PrescriptionFields value={rx} onChange={setRx} />
        </FormShell>
    );
}

function DispenseForm({
    item,
    pending,
    onSubmit,
    onCancel,
}: FormProps<CounterAction> & { item: PharmacyRequestItem }) {
    const [who, setWho] = useState("patient");
    return (
        <FormShell
            title="Entregar no balcão"
            submit="Confirmar entrega no balcão"
            pending={pending}
            onCancel={onCancel}
            onSubmit={() =>
                onSubmit(
                    who === "patient"
                        ? { action: "dispense", pickedUpBy: "patient" }
                        : { action: "dispense", pickedUpBy: "caregiver", caregiverId: who },
                )
            }
        >
            <Choices legend="Quem está retirando?">
                <Choice
                    name="who"
                    label={`${item.patient.name} (paciente)`}
                    checked={who === "patient"}
                    onChange={() => setWho("patient")}
                />
                {item.patient.caregivers.map((c) => (
                    <Choice
                        key={c.id}
                        name="who"
                        label={`${c.fullName} (${c.relationship})`}
                        checked={who === c.id}
                        onChange={() => setWho(c.id)}
                    />
                ))}
            </Choices>
            <p>Confira o documento de quem retira.</p>
        </FormShell>
    );
}

function ScheduleForm({ pending, onSubmit, onCancel }: FormProps<CounterAction>) {
    const [window, setWindow] = useState("Amanhã, 8h às 12h");
    const [error, setError] = useState("");
    return (
        <FormShell
            title="Agendar entrega"
            submit="Agendar entrega"
            pending={pending}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                if (window.trim().length < 3)
                    return setError("Escreva o dia e o horário da entrega.");
                setError("");
                onSubmit({ action: "schedule_delivery", scheduledWindow: window.trim() });
            }}
        >
            <TextField
                label="Dia e horário da entrega"
                hint="Aparece para o paciente e para os entregadores."
                value={window}
                onChange={(e) => setWindow(e.target.value)}
            />
        </FormShell>
    );
}

function SupplierForm({
    item,
    pending,
    onSubmit,
    onCancel,
}: FormProps<CounterAction> & { item: PharmacyRequestItem }) {
    const suppliers = useQuery({
        queryKey: qk.suppliers,
        queryFn: listSuppliers,
        staleTime: 60 * 60_000,
    });
    const orders = useQuery({
        queryKey: qk.pharmacy.purchaseOrders,
        queryFn: listPharmacyPurchaseOrders,
    });
    const open = orders.data?.find(
        (o) => o.medication === item.request.medication.displayName && o.status !== "received",
    );
    const [supplierId, setSupplierId] = useState("");
    const [error, setError] = useState("");
    return (
        <FormShell
            title="Pedir ao fornecedor"
            submit={open ? "Juntar à compra aberta" : "Fazer pedido de compra"}
            pending={pending}
            error={error}
            onCancel={onCancel}
            onSubmit={() => {
                if (open) return onSubmit({ action: "order_from_supplier" });
                if (!supplierId) return setError("Escolha o fornecedor.");
                setError("");
                onSubmit({ action: "order_from_supplier", supplierId });
            }}
        >
            {open ? (
                <p>
                    Já existe uma compra aberta com {open.supplier.name}. O paciente entra na lista
                    de espera dessa compra.
                </p>
            ) : (
                <SelectField
                    label="Fornecedor"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    options={[
                        {
                            value: "",
                            label: suppliers.isPending ? "Carregando…" : "Escolha o fornecedor",
                        },
                        ...(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })),
                    ]}
                />
            )}
            <p>
                O paciente entra na lista de espera e é avisado quando o fornecedor confirmar o
                prazo.
            </p>
        </FormShell>
    );
}
