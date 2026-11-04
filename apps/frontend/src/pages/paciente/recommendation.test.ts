import { describe, expect, it } from "vitest";
import { pickRecommendation } from "./recommendation";
import { cena1Availability } from "../../../test/fixtures";

describe("pickRecommendation", () => {
    it("pickRecommendation escolhe a Jardim e ignora PFPB e unidade zerada", () => {
        const r = pickRecommendation(cena1Availability());
        expect(r.reference?.pharmacyName).toBe("UBS Centro");
        expect(r.best?.pharmacyName).toBe("UBS Jardim São Sebastião");
        expect(r.noneInNetwork).toBe(false);
    });

    it("ninguém tem: sem melhor unidade e noneInNetwork", () => {
        const resp = cena1Availability();
        resp.foundInNetwork = false;
        resp.items = resp.items.map((i) => (i.kind === "pfpb" ? i : { ...i, status: "out" }));
        const r = pickRecommendation(resp);
        expect(r.best).toBeNull();
        expect(r.noneInNetwork).toBe(true);
    });
});
