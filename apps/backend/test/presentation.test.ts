import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers.js";
import { ROOM_LIMITS, RoomStore, type RoomEvent } from "../src/services/presentation-rooms.js";

// Controle da apresentação pelo celular: o telão abre uma sala, o celular manda comandos.
describe("salas da apresentação (memória)", () => {
    it("cria sala com código legível de 6 caracteres e chave do telão", () => {
        const store = new RoomStore();
        const room = store.create();
        expect(room.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
        expect(room.screenKey).toMatch(/^[0-9a-f]{32}$/);
        expect(store.has(room.code)).toBe(true);
    });

    it("comando do celular chega ao telão, e o estado do telão chega ao celular", () => {
        const store = new RoomStore();
        const { code, screenKey } = store.create();
        const screen: RoomEvent[] = [];
        const remote: RoomEvent[] = [];
        store.subscribe(code, "screen", (e) => screen.push(e));
        store.subscribe(code, "remote", (e) => remote.push(e));

        store.command(code, { action: "next" });
        expect(screen).toContainEqual({ type: "command", data: { action: "next" } });

        const state = { index: 2, total: 15, paused: false, ids: ["cover", "maria", "problema"] };
        store.setState(code, screenKey, state);
        expect(remote).toContainEqual({ type: "state", data: state });
    });

    it("o telão sabe quantos celulares estão conectados", () => {
        const store = new RoomStore();
        const { code } = store.create();
        const screen: RoomEvent[] = [];
        store.subscribe(code, "screen", (e) => screen.push(e));
        const leave = store.subscribe(code, "remote", () => {});
        expect(screen.at(-1)).toEqual({ type: "remotes", data: { count: 1 } });
        leave();
        expect(screen.at(-1)).toEqual({ type: "remotes", data: { count: 0 } });
    });

    it("celular que entra depois recebe o slide atual na hora", () => {
        const store = new RoomStore();
        const { code, screenKey } = store.create();
        const state = { index: 0, total: 2, paused: true, ids: ["cover", "fim"] };
        store.setState(code, screenKey, state);
        const remote: RoomEvent[] = [];
        store.subscribe(code, "remote", (e) => remote.push(e));
        expect(remote[0]).toEqual({ type: "state", data: state });
    });

    it("só o telão (com a chave) informa o estado", () => {
        const store = new RoomStore();
        const { code } = store.create();
        expect(() =>
            store.setState(code, "0".repeat(32), { index: 0, total: 1, paused: false, ids: [] }),
        ).toThrow(/telão/);
    });

    it("sala que não existe responde não encontrada", () => {
        const store = new RoomStore();
        expect(() => store.command("ZZZZZZ", { action: "next" })).toThrow(/Sala/);
        expect(() => store.subscribe("ZZZZZZ", "remote", () => {})).toThrow(/Sala/);
    });

    it("barra rajada de comandos na mesma sala", () => {
        let now = 1_000;
        const store = new RoomStore(() => now);
        const { code } = store.create();
        for (let i = 0; i < ROOM_LIMITS.commandsPerSecond; i++)
            store.command(code, { action: "next" });
        expect(() => store.command(code, { action: "next" })).toThrow(/comandos/);
        now += 1_001;
        expect(() => store.command(code, { action: "next" })).not.toThrow();
    });

    it("sala parada e sem ninguém conectado expira", () => {
        let now = 0;
        const store = new RoomStore(() => now);
        const { code } = store.create();
        now += ROOM_LIMITS.ttlMs + 1;
        store.create(); // criar outra sala faz a limpeza
        expect(store.has(code)).toBe(false);
    });

    it("limita o número de salas abertas", () => {
        const store = new RoomStore();
        for (let i = 0; i < ROOM_LIMITS.maxRooms; i++) store.create();
        expect(() => store.create()).toThrow(/salas/);
    });
});

describe("rotas da apresentação", () => {
    let app: FastifyInstance | null = null;
    afterEach(async () => {
        await app?.close();
        app = null;
    });

    it("POST /api/presentation-rooms cria a sala", async () => {
        app = buildTestApp();
        const res = await app.inject({ method: "POST", url: "/api/presentation-rooms" });
        expect(res.statusCode).toBe(201);
        expect(res.json().code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    });

    it("comando para sala inexistente é 404; comando inválido é 400", async () => {
        app = buildTestApp();
        const missing = await app.inject({
            method: "POST",
            url: "/api/presentation-rooms/ZZZZZZ/commands",
            payload: { action: "next" },
        });
        expect(missing.statusCode).toBe(404);
        const { code } = (
            await app.inject({ method: "POST", url: "/api/presentation-rooms" })
        ).json();
        const bad = await app.inject({
            method: "POST",
            url: `/api/presentation-rooms/${code}/commands`,
            payload: { action: "apagar-tudo" },
        });
        expect(bad.statusCode).toBe(400);
        const ok = await app.inject({
            method: "POST",
            url: `/api/presentation-rooms/${code}/commands`,
            payload: { action: "goto", slide: 3 },
        });
        expect(ok.statusCode).toBe(204);
    });

    it("estado com chave errada é 403", async () => {
        app = buildTestApp();
        const { code, screenKey } = (
            await app.inject({ method: "POST", url: "/api/presentation-rooms" })
        ).json();
        const body = { index: 0, total: 1, paused: false, ids: ["cover"] };
        const wrong = await app.inject({
            method: "PUT",
            url: `/api/presentation-rooms/${code}/state`,
            payload: { ...body, screenKey: "0".repeat(32) },
        });
        expect(wrong.statusCode).toBe(403);
        const ok = await app.inject({
            method: "PUT",
            url: `/api/presentation-rooms/${code}/state`,
            payload: { ...body, screenKey },
        });
        expect(ok.statusCode).toBe(204);
    });

    it("o telão recebe pelo stream (SSE) o comando enviado pelo celular", async () => {
        app = buildTestApp();
        await app.listen({ port: 0, host: "127.0.0.1" });
        const address = app.server.address();
        if (address === null || typeof address === "string") throw new Error("sem porta");
        const base = `http://127.0.0.1:${address.port}/api/presentation-rooms`;
        const { code } = (await (await fetch(base, { method: "POST" })).json()) as {
            code: string;
        };
        const abort = new AbortController();
        const stream = await fetch(`${base}/${code}/events?role=screen`, {
            signal: abort.signal,
        });
        expect(stream.status).toBe(200);
        expect(stream.headers.get("content-type")).toContain("text/event-stream");
        const reader = stream.body!.getReader();
        const decoder = new TextDecoder();
        await reader.read(); // comentário inicial
        await fetch(`${base}/${code}/commands`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "prev" }),
        });
        let text = "";
        while (!text.includes("event: command")) {
            const { value, done } = await reader.read();
            if (done) break;
            text += decoder.decode(value);
        }
        abort.abort();
        expect(text).toContain("event: command");
        expect(text).toContain('"action":"prev"');
    });
});
