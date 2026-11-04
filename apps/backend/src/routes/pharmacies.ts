import type { FastifyPluginAsync } from "fastify";
import { asc } from "drizzle-orm";
import { pharmacies } from "../db/schema.js";

export interface PharmacyView {
    id: string;
    name: string;
    kind: "ubs" | "municipal_pharmacy" | "specialized_pharmacy" | "pfpb";
    network: "municipal" | "state" | "pfpb";
    address: string;
    openingHours: string;
    phone: string;
    latitude: number | null;
    longitude: number | null;
}

// Pública: o cadastro do paciente precisa escolher a unidade de referência.
export const pharmacyListRoutes: FastifyPluginAsync = async (app) => {
    app.get("/pharmacies", async () => {
        const rows = await app.db.select().from(pharmacies).orderBy(asc(pharmacies.name));
        const items: PharmacyView[] = rows.map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            network: p.network,
            address: p.address,
            openingHours: p.openingHours,
            phone: p.phone,
            latitude: p.latitude,
            longitude: p.longitude,
        }));
        return { items };
    });
};
