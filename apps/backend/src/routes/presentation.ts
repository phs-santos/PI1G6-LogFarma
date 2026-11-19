// Controle da apresentação (/apresentacao) pelo celular. Rotas públicas: não há login nem dado
// pessoal, só o slide atual. O telão escuta por Server-Sent Events; o celular manda comandos.
import type { FastifyPluginAsync } from "fastify";
import {
    RoomStore,
    type RemoteCommand,
    type RoomEvent,
    type RoomRole,
    type ScreenState,
} from "../services/presentation-rooms.js";

const codeParams = {
    type: "object",
    required: ["code"],
    properties: { code: { type: "string", pattern: "^[A-HJ-NP-Z2-9]{6}$" } },
} as const;

const HEARTBEAT_MS = 20_000;

export const presentationRoutes: FastifyPluginAsync = async (app) => {
    // Uma sala vale enquanto este processo estiver de pé (cada buildApp tem a sua).
    const store = new RoomStore();

    app.post("/presentation-rooms", async (_request, reply) => {
        return reply.code(201).send(store.create());
    });

    app.get<{ Params: { code: string }; Querystring: { role: RoomRole } }>(
        "/presentation-rooms/:code/events",
        {
            schema: {
                params: codeParams,
                querystring: {
                    type: "object",
                    required: ["role"],
                    properties: { role: { type: "string", enum: ["screen", "remote"] } },
                },
            },
        },
        async (request, reply) => {
            const { code } = request.params;
            store.assertCanSubscribe(code);
            reply.hijack();
            const raw = reply.raw;
            raw.writeHead(200, {
                ...(reply.getHeaders() as Record<string, string>),
                "content-type": "text/event-stream; charset=utf-8",
                "cache-control": "no-cache, no-transform",
                connection: "keep-alive",
                // Sem isso o nginx do frontend segura os eventos no buffer.
                "x-accel-buffering": "no",
            });
            raw.write(": conectado\n\n");
            const send = (event: RoomEvent) =>
                raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
            let unsubscribe: () => void = () => {};
            try {
                unsubscribe = store.subscribe(code, request.query.role, send);
            } catch {
                raw.end();
                return;
            }
            const heartbeat = setInterval(() => raw.write(": ping\n\n"), HEARTBEAT_MS);
            request.raw.on("close", () => {
                clearInterval(heartbeat);
                unsubscribe();
            });
        },
    );

    app.post<{ Params: { code: string }; Body: RemoteCommand }>(
        "/presentation-rooms/:code/commands",
        {
            schema: {
                params: codeParams,
                body: {
                    type: "object",
                    required: ["action"],
                    additionalProperties: false,
                    properties: {
                        action: { type: "string", enum: ["next", "prev", "goto", "pause", "play"] },
                        slide: { type: "integer", minimum: 0, maximum: 199 },
                    },
                },
            },
        },
        async (request, reply) => {
            store.command(request.params.code, request.body);
            return reply.code(204).send();
        },
    );

    app.put<{ Params: { code: string }; Body: ScreenState & { screenKey: string } }>(
        "/presentation-rooms/:code/state",
        {
            schema: {
                params: codeParams,
                body: {
                    type: "object",
                    required: ["screenKey", "index", "total", "paused", "ids"],
                    additionalProperties: false,
                    properties: {
                        screenKey: { type: "string", pattern: "^[0-9a-f]{32}$" },
                        index: { type: "integer", minimum: 0, maximum: 199 },
                        total: { type: "integer", minimum: 1, maximum: 200 },
                        paused: { type: "boolean" },
                        ids: {
                            type: "array",
                            maxItems: 200,
                            items: { type: "string", pattern: "^[A-Za-z0-9_-]{1,64}$" },
                        },
                    },
                },
            },
        },
        async (request, reply) => {
            const { screenKey, ...state } = request.body;
            store.setState(request.params.code, screenKey, state);
            return reply.code(204).send();
        },
    );
};
