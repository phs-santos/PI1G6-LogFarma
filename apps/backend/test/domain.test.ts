import { describe, expect, it } from "vitest";
import { compareWaitlist, computePriority } from "../src/domain/priority.js";
import { distanceKm, routeUrl } from "../src/domain/geo.js";
import { stockStatus } from "../src/domain/availability.js";
import { prescriptionValidUntil } from "../src/domain/prescription.js";
import { pickBatchesFefo } from "../src/domain/batches.js";
import { normalizeSearch } from "../src/domain/text.js";
import { assertTransition } from "../src/domain/request-status.js";
import { ConflictError } from "../src/domain/errors.js";

const today = new Date("2026-11-03T12:00:00Z");
const days = { simpleContinuous: 180, simple: 30, antimicrobial: 10, specialControl: 30 };

describe("computePriority", () => {
    it("crônica de 72 anos vale 300", () => {
        expect(computePriority({ category: "chronic", birthDate: "1954-03-10" }, today)).toBe(300);
    });
    it("sem categoria e 85 anos vale 200", () => {
        expect(computePriority({ category: null, birthDate: "1941-01-01" }, today)).toBe(200);
    });
    it("quem faz 60 anos hoje conta como 60+", () => {
        expect(computePriority({ category: null, birthDate: "1966-11-03" }, today)).toBe(100);
    });
    it("59 anos e 364 dias vale 0", () => {
        expect(computePriority({ category: null, birthDate: "1966-11-04" }, today)).toBe(0);
    });
    it("oncológico de 30 anos vale 400", () => {
        expect(computePriority({ category: "oncology", birthDate: "1996-05-05" }, today)).toBe(400);
    });
});

describe("compareWaitlist", () => {
    it("ordena por prioridade e desempata por chegada", () => {
        const t = (n: number) => new Date(2026, 10, n);
        const list = [
            { priority: 0, createdAt: t(1) },
            { priority: 400, createdAt: t(3) },
            { priority: 300, createdAt: t(2) },
            { priority: 300, createdAt: t(1) },
        ].sort(compareWaitlist);
        expect(list.map((x) => [x.priority, x.createdAt.getDate()])).toEqual([
            [400, 3],
            [300, 1],
            [300, 2],
            [0, 1],
        ]);
    });
});

describe("geo", () => {
    it("distância de ~1,1 km entre duas UBS de Taquaritinga", () => {
        const d = distanceKm(
            { latitude: -21.406, longitude: -48.505 },
            { latitude: -21.415, longitude: -48.5 },
        );
        expect(d).not.toBeNull();
        expect(d!).toBeGreaterThanOrEqual(1.0);
        expect(d!).toBeLessThanOrEqual(1.2);
    });
    it("sem coordenadas devolve null", () => {
        expect(distanceKm(null, { latitude: 1, longitude: 1 })).toBeNull();
        expect(routeUrl({ latitude: 1, longitude: 1 }, null)).toBeNull();
    });
    it("link de rota do Google Maps", () => {
        expect(
            routeUrl(
                { latitude: -21.4, longitude: -48.5 },
                { latitude: -21.41, longitude: -48.49 },
            ),
        ).toBe(
            "https://www.google.com/maps/dir/?api=1&origin=-21.4,-48.5&destination=-21.41,-48.49",
        );
    });
});

describe("stockStatus", () => {
    it("zero é out, até o mínimo é low, acima é available", () => {
        expect(stockStatus(0, 10)).toBe("out");
        expect(stockStatus(10, 10)).toBe("low");
        expect(stockStatus(11, 10)).toBe("available");
    });
});

describe("prescriptionValidUntil", () => {
    it("receita simples de uso contínuo emitida em 2026-11-01 vale até 2027-04-30", () => {
        expect(prescriptionValidUntil("simple", true, "2026-11-01", days)).toBe("2027-04-30");
    });
    it("antimicrobiano vale 10 dias", () => {
        expect(prescriptionValidUntil("antimicrobial", false, "2026-11-01", days)).toBe(
            "2026-11-11",
        );
    });
    it("simples sem uso contínuo vale 30 dias", () => {
        expect(prescriptionValidUntil("simple", false, "2026-11-01", days)).toBe("2026-12-01");
    });
});

describe("pickBatchesFefo", () => {
    const batches = [
        { id: "A", expiryDate: "2026-10-01", available: 5 },
        { id: "B", expiryDate: "2027-01-01", available: 3 },
        { id: "C", expiryDate: "2026-12-01", available: 4 },
    ];
    it("ignora vencidos e usa primeiro o que vence antes", () => {
        expect(pickBatchesFefo(batches, 6, "2026-11-03")).toEqual([
            { batchId: "C", quantity: 4 },
            { batchId: "B", quantity: 2 },
        ]);
    });
    it("devolve null quando não há o suficiente sem os vencidos", () => {
        expect(pickBatchesFefo(batches, 8, "2026-11-03")).toBeNull();
    });
});

describe("normalizeSearch", () => {
    it("tira acento, maiúscula e espaços extras", () => {
        expect(normalizeSearch("LOSÁRTANA  Potássica")).toBe("losartana potassica");
    });
});

describe("assertTransition", () => {
    it("bloqueia saltos inválidos", () => {
        expect(() => assertTransition("requested", "delivered")).toThrow(ConflictError);
    });
    it("permite as setas do diagrama, a falha de entrega e a recusa de transferência", () => {
        expect(() => assertTransition("arrived", "delivery_scheduled")).not.toThrow();
        expect(() => assertTransition("out_for_delivery", "arrived")).not.toThrow();
        expect(() => assertTransition("in_transfer", "requested")).not.toThrow();
    });
});
