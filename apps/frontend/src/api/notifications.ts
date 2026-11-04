import { apiFetch } from "./client";
import type { Items, NotificationView } from "./types";

/** Avisos de quem entrou, mais recentes primeiro. */
export async function listNotifications(unread?: boolean): Promise<NotificationView[]> {
    return (
        await apiFetch<Items<NotificationView>>("/notifications", {
            query: { unread: unread ? true : undefined },
        })
    ).items;
}

export async function markNotificationRead(id: string): Promise<void> {
    await apiFetch<{ ok: true }>(`/notifications/${id}/read`, { method: "POST" });
}
