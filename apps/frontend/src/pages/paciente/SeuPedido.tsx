import { useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Notice, Tarja, Timeline, ConfirmDialog } from "@fatec-pi/style-guide";
import { getRequest, updateRequest } from "../../api/requests";
import { LIVE, qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { formatDayMonth } from "../../lib/dates";
import { Loaded } from "../../ui/Loaded";
import { requestTimeline } from "./timeline";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

/** RF05: acompanhar o pedido, ao vivo. */
export function SeuPedido() {
    usePageTitle("Seu pedido");
    const { id = "" } = useParams();
    const [confirming, setConfirming] = useState(false);
    const query = useQuery({
        queryKey: qk.request(id),
        queryFn: () => getRequest(id),
        refetchInterval: LIVE,
    });
    const cancel = useActionMutation(() => updateRequest(id, { cancel: true }), {
        invalidate: [qk.requests],
        onSuccess: () => setConfirming(false),
    });

    return (
        <Loaded query={query} what="seu pedido">
            {(view) => {
                const steps = requestTimeline(view);
                const current = steps.find((s) => s.state === "current");
                const cold =
                    view.delivery?.requiresRefrigeration ||
                    view.medication.storage === "refrigerated";
                const canCancel = view.status === "requested" || view.status === "waitlisted";
                const pickupHere =
                    view.fulfillment === "pickup" && view.status === "ready_for_pickup";
                return (
                    <>
                        <h1>Seu pedido</h1>
                        <p className="app-lead">
                            {view.medication.displayName}, {view.quantity} unidades
                        </p>
                        <Tarja type={view.medication.prescriptionType} />
                        <p className="sg-visually-hidden" role="status" aria-live="polite">
                            {current ? `Agora: ${current.label}` : ""}
                        </p>
                        {pickupHere && (
                            <Notice tone="success" title="Pode retirar">
                                <p>
                                    {view.pharmacy.name}, {view.pharmacy.address}.{" "}
                                    {view.pharmacy.openingHours}.
                                </p>
                            </Notice>
                        )}
                        {view.expectedAt && (
                            <p className="app-highlight">
                                Previsão de chegada: {formatDayMonth(view.expectedAt)}
                            </p>
                        )}
                        {view.waitlistPosition !== null && (
                            <p className="app-highlight">
                                Posição na lista de espera: {view.waitlistPosition}º lugar
                            </p>
                        )}
                        <Timeline label="Situação do pedido" steps={steps} />
                        {view.delivery && view.status !== "delivered" && (
                            <dl className="app-facts">
                                <div>
                                    <dt>Entrega</dt>
                                    <dd>{view.delivery.scheduledWindow}</dd>
                                </div>
                            </dl>
                        )}
                        {cold && view.fulfillment === "delivery" && view.status !== "cancelled" && (
                            <Notice tone="info" title="Ao receber, guarde na geladeira." />
                        )}
                        {canCancel && (
                            <Button variant="danger" block onClick={() => setConfirming(true)}>
                                Cancelar pedido
                            </Button>
                        )}
                        <ConfirmDialog
                            open={confirming}
                            title="Cancelar este pedido?"
                            confirmLabel="Sim, cancelar o pedido"
                            cancelLabel="Não, manter o pedido"
                            danger
                            loading={cancel.isPending}
                            onConfirm={() => cancel.run(undefined)}
                            onClose={() => setConfirming(false)}
                        >
                            <p>Se precisar do remédio depois, faça um pedido novo.</p>
                            {cancel.isError && (
                                <p className="sg-field__error" role="alert">
                                    {cancel.error.message}
                                </p>
                            )}
                        </ConfirmDialog>
                    </>
                );
            }}
        </Loaded>
    );
}
