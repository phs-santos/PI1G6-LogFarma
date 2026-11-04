import { useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ActionList, Button, EmptyState, Notice } from "@fatec-pi/style-guide";
import { courierAction, listCourierDeliveries } from "../../api/courier";
import type { CourierAction } from "../../api/types";
import { LIVE, qk } from "../../app/queryKeys";
import { useActionMutation } from "../../app/useActionMutation";
import { formatPhone, telHref } from "../../lib/format";
import { InlineText } from "../../ui/InlineText";
import { Loaded } from "../../ui/Loaded";
import { LinkButton } from "../../ui/LinkButton";
import { DELIVERY_STATUS } from "./texts";
import "../paciente/paciente.css";

/** Uma entrega aceita: para quem, onde, e os três passos. */
export function EntregaDetalhe() {
    const { id = "" } = useParams();
    const query = useQuery({
        queryKey: qk.courier.deliveries("mine"),
        queryFn: () => listCourierDeliveries("mine"),
        refetchInterval: LIVE,
    });
    const [form, setForm] = useState<"deliver" | "fail" | null>(null);
    const act = useActionMutation((body: CourierAction) => courierAction(id, body), {
        invalidate: [["courier"]],
        onSuccess: () => setForm(null),
    });

    return (
        <Loaded query={query} what="a entrega">
            {(items) => {
                const d = items.find((x) => x.id === id);
                if (!d || !d.recipient) {
                    return (
                        <EmptyState
                            title="Esta entrega não está com você."
                            action={<LinkButton to="/entregas">Ver entregas</LinkButton>}
                        />
                    );
                }
                return (
                    <>
                        <h1>{d.recipient.name}</h1>
                        <p className="app-lead">{DELIVERY_STATUS[d.status]}</p>
                        <dl className="app-facts">
                            <div>
                                <dt>Endereço</dt>
                                <dd>{d.recipient.address}</dd>
                            </div>
                            <div>
                                <dt>Remédio</dt>
                                <dd>{d.medication}</dd>
                            </div>
                            <div>
                                <dt>Retirar em</dt>
                                <dd>
                                    {d.pharmacy.name}, {d.pharmacy.address}
                                </dd>
                            </div>
                            <div>
                                <dt>Quando</dt>
                                <dd>{d.scheduledWindow}</dd>
                            </div>
                        </dl>
                        {d.requiresRefrigeration && (
                            <Notice tone="attention" title="Refrigerado">
                                <p>Ao entregar, lembre: guardar na geladeira.</p>
                            </Notice>
                        )}
                        {act.isError && (
                            <Notice tone="danger" title="Não foi possível concluir.">
                                <p>{act.error.message}</p>
                            </Notice>
                        )}
                        <ActionList label="Entrega">
                            <a
                                className="sg-button sg-button--secondary sg-button--lg sg-button--block app-link-button"
                                href={telHref(d.recipient.phone)}
                            >
                                Ligar para {formatPhone(d.recipient.phone)}
                            </a>
                            {d.status === "scheduled" && (
                                <Button
                                    block
                                    size="lg"
                                    loading={act.isPending}
                                    onClick={() => act.run({ action: "pick_up" })}
                                >
                                    Retirei na unidade
                                </Button>
                            )}
                            {d.status === "out_for_delivery" && form === null && (
                                <>
                                    <Button block size="lg" onClick={() => setForm("deliver")}>
                                        Entreguei
                                    </Button>
                                    <Button
                                        block
                                        size="lg"
                                        variant="danger"
                                        onClick={() => setForm("fail")}
                                    >
                                        Não consegui entregar
                                    </Button>
                                </>
                            )}
                        </ActionList>
                        {form === "deliver" && (
                            <InlineText
                                label="Nome de quem recebeu"
                                submit="Confirmar entrega"
                                required="Escreva o nome de quem recebeu."
                                pending={act.isPending}
                                onSubmit={(receivedBy) =>
                                    act.run({ action: "deliver", receivedBy })
                                }
                                onCancel={() => setForm(null)}
                            />
                        )}
                        {form === "fail" && (
                            <InlineText
                                label="O que aconteceu?"
                                submit="Registrar que não entreguei"
                                required="Escreva o motivo."
                                pending={act.isPending}
                                onSubmit={(reason) => act.run({ action: "fail", reason })}
                                onCancel={() => setForm(null)}
                            />
                        )}
                        {d.status === "delivered" && (
                            <Notice tone="success" title={`Entregue a ${d.receivedBy ?? ""}.`} />
                        )}
                        {d.status === "failed" && (
                            <Notice
                                tone="attention"
                                title={`Não entregue: ${d.failureReason ?? ""}`}
                            />
                        )}
                    </>
                );
            }}
        </Loaded>
    );
}
