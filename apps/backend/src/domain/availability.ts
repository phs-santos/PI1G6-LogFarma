export type StockStatus = "available" | "low" | "out";

export function stockStatus(available: number, minQuantity: number): StockStatus {
    if (available <= 0) return "out";
    if (available <= minQuantity) return "low";
    return "available";
}
