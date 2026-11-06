import { NavLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { listPharmacyRequests, listTransfers } from "../../api/pharmacy";
import { LIVE, qk } from "../../app/queryKeys";
import { NavCount } from "../../ui/NavCount";

/** Itens do menu da farmácia, com o número de pendências em Pedidos e Transferências. */
export function PharmacyNav() {
    const requests = useQuery({
        queryKey: qk.pharmacy.requests(),
        queryFn: () => listPharmacyRequests(),
        refetchInterval: LIVE,
    });
    const toUs = useQuery({
        // Pedidos de outras unidades para nós (o remédio sai daqui).
        queryKey: qk.pharmacy.transfers("outgoing"),
        queryFn: () => listTransfers("outgoing"),
        refetchInterval: LIVE,
    });
    return (
        <>
            <NavLink to="/farmacia/pedidos">
                Pedidos
                <NavCount
                    count={requests.data?.filter((i) => i.request.status === "requested").length}
                />
            </NavLink>
            <NavLink to="/farmacia/transferencias">
                Transferências
                <NavCount count={toUs.data?.filter((t) => t.status === "requested").length} />
            </NavLink>
            <NavLink to="/farmacia/compras">Compras</NavLink>
            <NavLink to="/farmacia/estoque">Estoque</NavLink>
            <NavLink to="/farmacia/entregas">Entregas</NavLink>
        </>
    );
}
