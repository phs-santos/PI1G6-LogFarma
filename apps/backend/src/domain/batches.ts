// Saída de estoque: primeiro o lote que vence antes (FEFO), nunca lote vencido.
export interface BatchAvailability {
    id: string;
    expiryDate: string;
    available: number;
}

export function pickBatchesFefo(
    batches: BatchAvailability[],
    quantity: number,
    today: string,
): { batchId: string; quantity: number }[] | null {
    const usable = batches
        .filter((b) => b.expiryDate >= today && b.available > 0)
        .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
    const picks: { batchId: string; quantity: number }[] = [];
    let remaining = quantity;
    for (const batch of usable) {
        if (remaining === 0) break;
        const take = Math.min(batch.available, remaining);
        picks.push({ batchId: batch.id, quantity: take });
        remaining -= take;
    }
    return remaining === 0 ? picks : null;
}
