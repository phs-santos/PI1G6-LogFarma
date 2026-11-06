import { PageHeader } from "@fatec-pi/style-guide";
import { Link, useParams } from "react-router";
import { Loaded } from "../../ui/Loaded";
import { telHref, formatPhone } from "../../lib/format";
import { hasIt } from "./recommendation";
import { useAvailability, usePharmacies } from "./queries";
import { UnitFacts, UnitStamp } from "./UnitStatus";
import "./paciente.css";
import { usePageTitle } from "../../app/usePageTitle";

/** RF02: todas as unidades da rede para este remédio. */
export function OutrasUnidades() {
    usePageTitle("Outras unidades");
    const { id = "" } = useParams();
    const query = useAvailability(id);
    const pharmacies = usePharmacies();
    const phoneOf = (pharmacyId: string) =>
        pharmacies.data?.find((p) => p.id === pharmacyId)?.phone;

    return (
        <Loaded query={query} what="as unidades">
            {(resp) => (
                <>
                    <PageHeader title="Outras unidades" description={resp.medication.displayName} />
                    <ul className="app-units" aria-label="Unidades da rede">
                        {resp.items.map((item) => {
                            const phone = phoneOf(item.pharmacyId);
                            return (
                                <li key={item.pharmacyId}>
                                    <strong>
                                        {item.pharmacyName}
                                        {item.isReference ? " (sua unidade)" : ""}
                                    </strong>
                                    <UnitStamp item={item} />
                                    {item.consultationOnly && (
                                        <p className="app-unit__fact">Só consulta: ligue antes</p>
                                    )}
                                    <UnitFacts item={item} />
                                    {item.consultationOnly && phone && (
                                        <a className="app-link" href={telHref(phone)}>
                                            {formatPhone(phone)}
                                        </a>
                                    )}
                                    {hasIt(item) && (
                                        <Link
                                            className="app-link"
                                            to={`/remedio/${id}/buscar/${item.pharmacyId}`}
                                        >
                                            Vou buscar na {item.pharmacyName}
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </Loaded>
    );
}
