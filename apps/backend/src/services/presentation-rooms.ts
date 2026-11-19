// Controle da apresentação pelo celular. O telão abre uma "sala"; quem tem o código manda
// comandos (próximo, anterior, pausar). Tudo só em memória: sem banco e sem dado pessoal.
// Se o backend reiniciar, as salas somem e o telão abre outra sozinho.
import { randomBytes, timingSafeEqual } from "node:crypto";
import { ConflictError, ForbiddenError, NotFoundError } from "../domain/errors.js";

export type RemoteAction = "next" | "prev" | "goto" | "pause" | "play";
export interface RemoteCommand {
    action: RemoteAction;
    slide?: number;
}
export interface ScreenState {
    index: number;
    total: number;
    paused: boolean;
    ids: string[];
}
export type RoomEvent =
    | { type: "command"; data: RemoteCommand }
    | { type: "state"; data: ScreenState }
    | { type: "remotes"; data: { count: number } };
export type RoomRole = "screen" | "remote";
type Listener = (event: RoomEvent) => void;

export const ROOM_LIMITS = {
    maxRooms: 50,
    ttlMs: 12 * 60 * 60 * 1000,
    maxListeners: 30,
    commandsPerSecond: 10,
};

// Sem letras que se confundem (I, O, 0, 1): fácil de digitar no celular. 32 símbolos → sem viés.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface Room {
    screenKey: string;
    state: ScreenState | null;
    screens: Set<Listener>;
    remotes: Set<Listener>;
    lastActivity: number;
    commandTimes: number[];
}

export class RoomStore {
    private rooms = new Map<string, Room>();

    constructor(private readonly now: () => number = Date.now) {}

    create(): { code: string; screenKey: string } {
        this.prune();
        if (this.rooms.size >= ROOM_LIMITS.maxRooms) {
            throw new ConflictError("Muitas salas abertas agora. Tente de novo em instantes.");
        }
        let code = "";
        do {
            code = [...randomBytes(6)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
        } while (this.rooms.has(code));
        const screenKey = randomBytes(16).toString("hex");
        this.rooms.set(code, {
            screenKey,
            state: null,
            screens: new Set(),
            remotes: new Set(),
            lastActivity: this.now(),
            commandTimes: [],
        });
        return { code, screenKey };
    }

    has(code: string): boolean {
        return this.rooms.has(code);
    }

    /** Confere antes de abrir o stream (dá para responder 404/409 com corpo normal). */
    assertCanSubscribe(code: string): void {
        const room = this.get(code);
        if (room.screens.size + room.remotes.size >= ROOM_LIMITS.maxListeners) {
            throw new ConflictError("Esta sala já tem conexões demais.");
        }
    }

    subscribe(code: string, role: RoomRole, listener: Listener): () => void {
        this.assertCanSubscribe(code);
        const room = this.get(code);
        const set = role === "screen" ? room.screens : room.remotes;
        set.add(listener);
        room.lastActivity = this.now();
        if (role === "remote") {
            if (room.state) listener({ type: "state", data: room.state });
            this.emitRemotes(room);
        } else {
            listener({ type: "remotes", data: { count: room.remotes.size } });
        }
        return () => {
            set.delete(listener);
            room.lastActivity = this.now();
            if (role === "remote") this.emitRemotes(room);
        };
    }

    command(code: string, command: RemoteCommand): void {
        const room = this.get(code);
        const now = this.now();
        room.commandTimes = room.commandTimes.filter((t) => now - t < 1000);
        if (room.commandTimes.length >= ROOM_LIMITS.commandsPerSecond) {
            throw new ConflictError("Calma: comandos demais em pouco tempo.");
        }
        room.commandTimes.push(now);
        room.lastActivity = now;
        for (const l of room.screens) l({ type: "command", data: command });
    }

    setState(code: string, screenKey: string, state: ScreenState): void {
        const room = this.get(code);
        const given = Buffer.from(screenKey);
        const expected = Buffer.from(room.screenKey);
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
            throw new ForbiddenError("Só o telão desta sala pode informar o slide atual.");
        }
        room.state = state;
        room.lastActivity = this.now();
        for (const l of room.remotes) l({ type: "state", data: state });
    }

    private get(code: string): Room {
        const room = this.rooms.get(code);
        if (!room) throw new NotFoundError("Sala não encontrada. Confira o código no telão.");
        return room;
    }

    private emitRemotes(room: Room): void {
        for (const l of room.screens) l({ type: "remotes", data: { count: room.remotes.size } });
    }

    /** Remove salas paradas há mais de 12 h e sem ninguém conectado. */
    private prune(): void {
        const now = this.now();
        for (const [code, room] of this.rooms) {
            const idle = now - room.lastActivity > ROOM_LIMITS.ttlMs;
            if (idle && room.screens.size === 0 && room.remotes.size === 0) this.rooms.delete(code);
        }
    }
}
