import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
    Button,
    EmptyState,
    Tarja,
    TextField,
    ChoiceGroup,
    ChoiceOption,
} from "@fatec-pi/style-guide";
import { getProfile, listCaregivers, listMyPrescriptions } from "../../api/me";
import { createRequest } from "../../api/requests";
import type { CreateRequestInput, Fulfillment, PrescriptionInput } from "../../api/types";
import { qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { formatDate } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { LinkButton } from "../../ui/LinkButton";
import {
    cleanPrescription,
    EMPTY_PRESCRIPTION,
    PrescriptionFields,
    prescriptionProblem,
} from "../../ui/PrescriptionFields";
import { useAvailability } from "./queries";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

type RxChoice = { kind: "saved"; id: string } | { kind: "new" } | { kind: "counter" };

/** RF04/RF06/RF08: pedir o remédio para retirar ou receber em casa. */
export function ConfirmarPedido() {
    usePageTitle("Confirmar pedido");
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const medicationId = params.get("medicationId") ?? "";
    const waitlist = params.get("waitlist") === "1";
    const asked = params.get("fulfillment");

    const availability = useAvailability(medicationId);
    const profile = useQuery({ queryKey: qk.profile, queryFn: getProfile });
    const caregivers = useQuery({ queryKey: qk.caregivers, queryFn: listCaregivers });
    const prescriptions = useQuery({
        queryKey: qk.prescriptions(medicationId),
        queryFn: () => listMyPrescriptions(medicationId),
        enabled: medicationId !== "",
    });

    const [fulfillmentChoice, setFulfillment] = useState<Fulfillment | null>(
        asked === "delivery" || asked === "pickup" ? asked : null,
    );
    const fulfillment: Fulfillment =
        fulfillmentChoice ?? (profile.data?.mobilityLimited ? "delivery" : "pickup");
    const [quantity, setQuantity] = useState("30");
    const [rxChoice, setRxChoice] = useState<RxChoice | null>(null);
    const [rx, setRx] = useState<PrescriptionInput>(EMPTY_PRESCRIPTION);
    const [formError, setFormError] = useState("");

    const usable = (prescriptions.data ?? []).filter((p) => p.usable);
    const rxSelected: RxChoice =
        rxChoice ?? (usable[0] ? { kind: "saved", id: usable[0].id } : { kind: "counter" });

    const create = useActionMutation(createRequest, {
        invalidate: [qk.requests],
        onSuccess: (request) => navigate(`/pedidos/${request.id}`, { replace: true }),
    });

    if (!medicationId) {
        return (
            <EmptyState
                title="Escolha o remédio primeiro."
                action={<LinkButton to="/buscar">Procurar remédio</LinkButton>}
            />
        );
    }

    return (
        <Loaded query={availability} what="o remédio">
            {({ medication }) => {
                const needsRx = medication.prescriptionType !== "none";
                const onSubmit = (e: FormEvent) => {
                    e.preventDefault();
                    const qty = Number(quantity);
                    if (!Number.isInteger(qty) || qty < 1) {
                        setFormError("Informe a quantidade em números, a partir de 1.");
                        return;
                    }
                    const input: CreateRequestInput = { medicationId, quantity: qty, fulfillment };
                    if (needsRx && rxSelected.kind === "saved")
                        input.prescriptionId = rxSelected.id;
                    if (needsRx && rxSelected.kind === "new") {
                        const problem = prescriptionProblem(rx);
                        if (problem) {
                            setFormError(problem);
                            return;
                        }
                        input.prescription = cleanPrescription(rx);
                    }
                    setFormError("");
                    create.run(input);
                };
                const address = profile.data?.address;
                const people = [
                    "Você",
                    ...(caregivers.data ?? []).map((c) => `${c.fullName} (${c.relationship})`),
                ];
                return (
                    <form onSubmit={onSubmit} noValidate>
                        <h1>Confirmar pedido</h1>
                        <p className="app-lead">{medication.displayName}</p>
                        <Tarja type={medication.prescriptionType} />

                        <div className="app-section">
                            <TextField
                                label="Quantidade (unidades)"
                                hint="Confira na receita quantas unidades você precisa."
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={999}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>

                        <ChoiceGroup
                            legend={
                                waitlist
                                    ? "Quando chegar, como você quer receber?"
                                    : "Como você quer receber?"
                            }
                        >
                            <ChoiceOption
                                name="fulfillment"
                                label="Buscar na farmácia"
                                checked={fulfillment === "pickup"}
                                onChange={() => setFulfillment("pickup")}
                            />
                            <ChoiceOption
                                name="fulfillment"
                                label="Receber em casa"
                                checked={fulfillment === "delivery"}
                                onChange={() => setFulfillment("delivery")}
                            />
                        </ChoiceGroup>

                        {needsRx && (
                            <ChoiceGroup legend="Receita">
                                {usable.map((p) => (
                                    <ChoiceOption
                                        key={p.id}
                                        name="rx"
                                        label={`Receita de ${p.prescriberName}, de ${formatDate(p.issuedAt)}, vale até ${formatDate(p.validUntil)}`}
                                        checked={
                                            rxSelected.kind === "saved" && rxSelected.id === p.id
                                        }
                                        onChange={() => setRxChoice({ kind: "saved", id: p.id })}
                                    />
                                ))}
                                <ChoiceOption
                                    name="rx"
                                    label="Informar uma receita nova"
                                    checked={rxSelected.kind === "new"}
                                    onChange={() => setRxChoice({ kind: "new" })}
                                />
                                <ChoiceOption
                                    name="rx"
                                    label="Vou mostrar a receita na farmácia"
                                    checked={rxSelected.kind === "counter"}
                                    onChange={() => setRxChoice({ kind: "counter" })}
                                />
                            </ChoiceGroup>
                        )}
                        {needsRx && rxSelected.kind === "new" && (
                            <div className="app-section">
                                <PrescriptionFields value={rx} onChange={setRx} />
                            </div>
                        )}

                        {fulfillment === "delivery" && address && (
                            <section className="app-section" aria-labelledby="entregar-em">
                                <h2 id="entregar-em">Entregar em</h2>
                                <p>
                                    {address.street}, {address.number} — {address.district},{" "}
                                    {address.city}/{address.state}
                                </p>
                                <p className="app-unit__fact--muted">
                                    Para mudar o endereço, vá em Meus dados.
                                </p>
                            </section>
                        )}
                        <section className="app-section" aria-labelledby="quem-recebe">
                            <h2 id="quem-recebe">
                                {fulfillment === "delivery"
                                    ? "Quem pode receber"
                                    : "Quem pode retirar"}
                            </h2>
                            <ul>
                                {people.map((p) => (
                                    <li key={p}>{p}</li>
                                ))}
                            </ul>
                        </section>

                        {(formError || create.isError) && (
                            <p className="sg-field__error" role="alert">
                                {formError || create.error?.message}
                            </p>
                        )}
                        <Button type="submit" block size="lg" loading={create.isPending}>
                            Confirmar pedido
                        </Button>
                    </form>
                );
            }}
        </Loaded>
    );
}
