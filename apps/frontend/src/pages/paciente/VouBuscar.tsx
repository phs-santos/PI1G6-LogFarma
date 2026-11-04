import { useParams } from "react-router";
import { ActionList, EmptyState, Tarja } from "@fatec-pi/style-guide";
import { Loaded } from "../../ui/Loaded";
import { LinkButton } from "../../ui/LinkButton";
import { formatKm, telHref, formatPhone } from "../../lib/format";
import { useAvailability, usePharmacies } from "./queries";
import "./paciente.css";

/** Sem a localização da paciente, o mapa abre pelo endereço da unidade. */
export function mapUrl(routeUrl: string | null, address: string): string {
    return (
        routeUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    );
}

/** RF03: como chegar. Não cria pedido: é só ir até lá. */
export function VouBuscar() {
    const { id = "", pharmacyId = "" } = useParams();
    const query = useAvailability(id);
    const pharmacies = usePharmacies();
    const phone = pharmacies.data?.find((p) => p.id === pharmacyId)?.phone;

    return (
        <Loaded query={query} what="o endereço da unidade">
            {(resp) => {
                const item = resp.items.find((i) => i.pharmacyId === pharmacyId);
                if (!item) {
                    return (
                        <EmptyState
                            title="Esta unidade não está na lista deste remédio."
                            action={
                                <LinkButton to={`/remedio/${id}`} variant="secondary">
                                    Ver onde tem
                                </LinkButton>
                            }
                        />
                    );
                }
                return (
                    <>
                        <h1>{item.pharmacyName}</h1>
                        <p className="app-lead">Para buscar {resp.medication.displayName}</p>
                        <Tarja type={resp.medication.prescriptionType} />
                        <dl className="app-facts">
                            <div>
                                <dt>Endereço</dt>
                                <dd>{item.address}</dd>
                            </div>
                            {item.distanceKm !== null && (
                                <div>
                                    <dt>Distância</dt>
                                    <dd>A {formatKm(item.distanceKm)} de você</dd>
                                </div>
                            )}
                            <div>
                                <dt>Horário</dt>
                                <dd>{item.openingHours}</dd>
                            </div>
                            {phone && (
                                <div>
                                    <dt>Telefone</dt>
                                    <dd>
                                        <a className="app-link" href={telHref(phone)}>
                                            {formatPhone(phone)}
                                        </a>
                                    </dd>
                                </div>
                            )}
                        </dl>
                        <ActionList label="Caminho">
                            <LinkButton to={mapUrl(item.routeUrl, item.address)} external>
                                Abrir o caminho no mapa
                            </LinkButton>
                        </ActionList>
                    </>
                );
            }}
        </Loaded>
    );
}
