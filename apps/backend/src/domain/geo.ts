// RF03 — distância em linha reta e link de rota (sem serviço de mapas pago).
export interface LatLng {
    latitude: number;
    longitude: number;
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function distanceKm(a: LatLng | null, b: LatLng | null): number | null {
    if (!a || !b) return null;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
    const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
    return Math.round(km * 10) / 10;
}

export function routeUrl(a: LatLng | null, b: LatLng | null): string | null {
    if (!a || !b) return null;
    return `https://www.google.com/maps/dir/?api=1&origin=${a.latitude},${a.longitude}&destination=${b.latitude},${b.longitude}`;
}

/** Converte colunas que podem ser nulas em LatLng | null. */
export function latLng(latitude: number | null, longitude: number | null): LatLng | null {
    return latitude === null || longitude === null ? null : { latitude, longitude };
}
