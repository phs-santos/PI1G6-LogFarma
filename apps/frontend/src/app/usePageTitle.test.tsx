import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isValidElement, type ReactElement } from "react";
import type { RouteObject } from "react-router";
import { renderApp, sessions } from "../../test/render";
import { mockApi } from "../../test/mockApi";
import { appRoutes } from "./router";

describe("título e foco", () => {
    it("trocar de tela move o foco para o h1 e muda o título", async () => {
        mockApi({
            "GET /api/notifications": { body: { items: [] } },
            "GET /api/requests": { body: { items: [] } },
            "GET /api/me/recent-medications": { body: { items: [] } },
        });
        renderApp({ route: "/", session: sessions.maria });
        await waitFor(() => expect(document.title).toBe("Início — LogFarma"));
        await userEvent
            .setup()
            .click(within(screen.getByRole("main")).getByRole("button", { name: "Procurar" }));
        const h1 = await screen.findByRole("heading", { level: 1, name: "Procurar remédio" });
        await waitFor(() => expect(document.activeElement).toBe(h1));
        expect(document.title).toBe("Procurar remédio — LogFarma");
    });

    it("nenhuma rota usa Placeholder", () => {
        const names: string[] = [];
        const walk = (routes: RouteObject[]) => {
            for (const r of routes) {
                if (isValidElement(r.element)) {
                    const type = (r.element as ReactElement).type;
                    names.push(typeof type === "function" ? type.name : String(type));
                }
                if (r.children) walk(r.children);
            }
        };
        walk(appRoutes);
        expect(names.length).toBeGreaterThan(20);
        expect(names).not.toContain("Placeholder");
    });
});
