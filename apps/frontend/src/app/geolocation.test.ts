import { describe, expect, it, vi } from "vitest";
import { requestLocation } from "./geolocation";

function stubGeolocation(impl: Geolocation["getCurrentPosition"]) {
    vi.stubGlobal("navigator", { ...navigator, geolocation: { getCurrentPosition: impl } });
}

describe("requestLocation", () => {
    it("requestLocation devolve null quando a permissão é negada", async () => {
        stubGeolocation((_ok, fail) =>
            fail?.({ code: 1, message: "denied" } as GeolocationPositionError),
        );
        await expect(requestLocation()).resolves.toBeNull();
    });

    it("devolve as coordenadas quando a pessoa permite", async () => {
        stubGeolocation((ok) =>
            ok({ coords: { latitude: -21.4, longitude: -48.5 } } as GeolocationPosition),
        );
        await expect(requestLocation()).resolves.toEqual({ latitude: -21.4, longitude: -48.5 });
    });

    it("sem geolocalização no aparelho devolve null", async () => {
        vi.stubGlobal("navigator", { ...navigator, geolocation: undefined });
        await expect(requestLocation()).resolves.toBeNull();
    });
});
