import { Link, useParams } from "react-router";
import { ActionList, Notice, Stamp, Tarja } from "@fatec-pi/style-guide";
import { Loaded } from "../../ui/Loaded";
import { LinkButton } from "../../ui/LinkButton";
import { hasIt, pickRecommendation } from "./recommendation";
import { useAvailability } from "./queries";
import { UnitFacts } from "./UnitStatus";
import "./paciente.css";

/** RF02–RF03: a unidade dela primeiro, depois a mais próxima que tem. */
export function OndeTem() {
    const { id = "" } = useParams();
    const query = useAvailability(id);
    const homeDelivery = `/pedido/novo?medicationId=${id}&fulfillment=delivery`;

    return (
        <Loaded query={query} what="onde tem o remédio">
            {(resp) => {
                const { reference, best, noneInNetwork } = pickRecommendation(resp);
                const ownHasIt = reference !== null && hasIt(reference);
                return (
                    <>
                        <h1>{resp.medication.displayName}</h1>
                        <Tarja type={resp.medication.prescriptionType} />

                        {reference && ownHasIt && (
                            <section
                                className="app-unit app-unit--ok"
                                aria-labelledby="sua-unidade"
                            >
                                <h2 id="sua-unidade" className="app-unit__title">
                                    Tem na sua unidade
                                </h2>
                                <p className="app-unit__fact">{reference.pharmacyName}</p>
                                <Stamp tone="ok">Tem</Stamp>
                                <UnitFacts item={reference} />
                            </section>
                        )}
                        {reference && !ownHasIt && (
                            <section className="app-unit" aria-labelledby="sua-unidade">
                                <h2 id="sua-unidade" className="app-unit__title">
                                    A {reference.pharmacyName} está sem
                                </h2>
                                <Stamp tone="danger">Em falta</Stamp>
                            </section>
                        )}

                        {ownHasIt && reference ? (
                            <ActionList label="Como você quer pegar">
                                <LinkButton to={`/remedio/${id}/buscar/${reference.pharmacyId}`}>
                                    Vou buscar lá
                                </LinkButton>
                                <LinkButton to={homeDelivery} variant="secondary">
                                    Receber em casa
                                </LinkButton>
                            </ActionList>
                        ) : best ? (
                            <>
                                <section
                                    className="app-unit app-unit--ok"
                                    aria-labelledby="mais-proxima"
                                >
                                    <h2 id="mais-proxima" className="app-unit__title">
                                        Tem na {best.pharmacyName}
                                    </h2>
                                    <Stamp tone="ok">Tem</Stamp>
                                    <UnitFacts item={best} />
                                </section>
                                <ActionList label="Como você quer pegar">
                                    <LinkButton to={`/remedio/${id}/buscar/${best.pharmacyId}`}>
                                        Vou buscar lá
                                    </LinkButton>
                                    <LinkButton to={homeDelivery} variant="secondary">
                                        Não consigo ir — receber em casa
                                    </LinkButton>
                                </ActionList>
                            </>
                        ) : noneInNetwork ? (
                            <>
                                <Notice tone="attention" title="Este remédio está em falta na rede">
                                    <p>
                                        Nenhuma unidade tem agora. Você pode pedir assim mesmo: a
                                        farmácia coloca você na lista de espera e avisa quando
                                        chegar.
                                    </p>
                                </Notice>
                                <ActionList label="O que fazer">
                                    <LinkButton to={`/pedido/novo?medicationId=${id}&waitlist=1`}>
                                        Pedir assim mesmo
                                    </LinkButton>
                                </ActionList>
                            </>
                        ) : null}

                        <p>
                            <Link className="app-link" to={`/remedio/${id}/unidades`}>
                                Ver outras unidades
                            </Link>
                        </p>
                    </>
                );
            }}
        </Loaded>
    );
}
