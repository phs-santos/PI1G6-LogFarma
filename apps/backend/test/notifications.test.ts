import { beforeEach, describe, expect, it } from "vitest";
import { notify } from "../src/services/notifications.js";
import {
    buildTestApp,
    createPatient,
    createPharmacy,
    loginAs,
    resetDb,
    testDb,
} from "./helpers.js";

describe("avisos", () => {
    beforeEach(() => resetDb());

    it("GET /api/notifications só traz as do usuário; marcar de outro usuário responde 404", async () => {
        const app = buildTestApp();
        const ubs = await createPharmacy();
        const maria = await createPatient(ubs.id, { email: "maria@example.com" });
        const joao = await createPatient(ubs.id, { email: "joao@example.com" });
        await notify(testDb, { userId: maria.id, title: "Olá Maria", body: "Seu remédio chegou." });
        await notify(testDb, { userId: joao.id, title: "Olá João", body: "Seu remédio chegou." });

        const cookie = await loginAs(app, "maria@example.com");
        const list = await app.inject({
            method: "GET",
            url: "/api/notifications",
            headers: { cookie },
        });
        expect(list.statusCode).toBe(200);
        expect(list.json().items.map((n: { title: string }) => n.title)).toEqual(["Olá Maria"]);

        const joaoCookie = await loginAs(app, "joao@example.com");
        const joaoList = await app.inject({
            method: "GET",
            url: "/api/notifications",
            headers: { cookie: joaoCookie },
        });
        const joaoNotification = joaoList.json().items[0].id as string;
        const forbidden = await app.inject({
            method: "POST",
            url: `/api/notifications/${joaoNotification}/read`,
            headers: { cookie },
        });
        expect(forbidden.statusCode).toBe(404);

        const own = list.json().items[0].id as string;
        const ok = await app.inject({
            method: "POST",
            url: `/api/notifications/${own}/read`,
            headers: { cookie },
        });
        expect(ok.statusCode).toBe(200);
        const unread = await app.inject({
            method: "GET",
            url: "/api/notifications?unread=true",
            headers: { cookie },
        });
        expect(unread.json().items).toHaveLength(0);
    });
});
