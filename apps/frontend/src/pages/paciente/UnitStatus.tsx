import { Stamp } from "@fatec-pi/style-guide";
import type { AvailabilityItem } from "../../api/types";
import { formatAgo, formatKm } from "../../lib/format";

export function UnitStamp({ item }: { item: AvailabilityItem }) {
    if (item.consultationOnly) return null;
    if (item.status === "available") return <Stamp tone="ok">Tem</Stamp>;
    if (item.status === "low") return <Stamp tone="ok">Tem pouco</Stamp>;
    return <Stamp tone="danger">Em falta</Stamp>;
}

/** "A 1,1 km de você" e "Atualizado há 2 h" (cada um só quando existe). */
export function UnitFacts({ item }: { item: AvailabilityItem }) {
    return (
        <>
            {item.distanceKm !== null && (
                <p className="app-unit__fact">A {formatKm(item.distanceKm)} de você</p>
            )}
            {item.updatedAt && (
                <p className="app-unit__fact app-unit__fact--muted">
                    Atualizado {formatAgo(item.updatedAt)}
                </p>
            )}
        </>
    );
}
