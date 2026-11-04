import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { notifications } from "../db/schema.js";
import { requireAuth } from "../auth/guards.js";
import { NotFoundError } from "../domain/errors.js";

export interface NotificationView {
    id: string;
    title: string;
    body: string;
    requestId: string | null;
    createdAt: string;
    readAt: string | null;
}

export const notificationRoutes: FastifyPluginAsync = async (app) => {
    app.addHook("preHandler", requireAuth);

    app.get<{ Querystring: { unread?: boolean } }>(
        "/notifications",
        {
            schema: {
                querystring: {
                    type: "object",
                    additionalProperties: false,
                    properties: { unread: { type: "boolean" } },
                },
            },
        },
        async (request) => {
            const where = request.query.unread
                ? and(eq(notifications.userId, request.user.id), isNull(notifications.readAt))
                : eq(notifications.userId, request.user.id);
            const rows = await app.db
                .select()
                .from(notifications)
                .where(where)
                .orderBy(desc(notifications.createdAt))
                .limit(100);
            const items: NotificationView[] = rows.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                requestId: n.requestId,
                createdAt: n.createdAt.toISOString(),
                readAt: n.readAt?.toISOString() ?? null,
            }));
            return { items };
        },
    );

    app.post<{ Params: { id: string } }>(
        "/notifications/:id/read",
        {
            schema: {
                params: {
                    type: "object",
                    required: ["id"],
                    properties: { id: { type: "string", format: "uuid" } },
                },
            },
        },
        async (request) => {
            const updated = await app.db
                .update(notifications)
                .set({ readAt: new Date() })
                .where(
                    and(
                        eq(notifications.id, request.params.id),
                        eq(notifications.userId, request.user.id),
                    ),
                )
                .returning({ id: notifications.id });
            if (updated.length === 0) throw new NotFoundError("Aviso não encontrado.");
            return { ok: true };
        },
    );
};
