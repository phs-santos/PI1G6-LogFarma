export interface Coordinates {
    latitude: number;
    longitude: number;
}

/**
 * Pede a localização ao celular (o próprio celular pergunta à pessoa).
 * Recusa, erro, demora de 10 s ou aparelho sem GPS → `null`, e o app segue sem distância.
 */
export function requestLocation(): Promise<Coordinates | null> {
    const geo = typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geo || typeof geo.getCurrentPosition !== "function") return Promise.resolve(null);
    return new Promise((resolve) => {
        geo.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => resolve(null),
            { timeout: 10_000, maximumAge: 5 * 60_000 },
        );
    });
}
