import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, type RouteObject } from "react-router";
import { RouterProvider } from "react-router/dom";
import { createQueryClient } from "../src/app/queryClient";
import { qk } from "../src/app/queryKeys";
import { appRoutes } from "../src/app/router";
import { SessionRoot } from "../src/app/session";
import type { MeProfile, SessionUser } from "../src/api/types";

export interface TestSession {
    user: SessionUser;
    profile: MeProfile;
}

interface Options {
    route?: string;
    /** Sem sessão = ninguém entrou. */
    session?: TestSession;
}

function testClient(session?: TestSession) {
    const client = createQueryClient();
    client.setDefaultOptions({
        queries: { ...client.getDefaultOptions().queries, retry: false },
        mutations: { retry: false },
    });
    client.setQueryData(qk.me, session ?? null);
    return client;
}

function mount(routes: RouteObject[], route: string, session?: TestSession) {
    const client = testClient(session);
    const router = createMemoryRouter(routes, { initialEntries: [route] });
    const utils = render(
        <QueryClientProvider client={client}>
            <RouterProvider router={router} />
        </QueryClientProvider>,
    );
    return { ...utils, router, client };
}

/** O app inteiro (todas as rotas, guarda de perfil e sessão), começando em `route`. */
export function renderApp({ route = "/", session }: Options = {}) {
    return mount(appRoutes, route, session);
}

/** Um componente só, dentro dos mesmos provedores do app. */
export function renderWithApp(ui: ReactElement, { route = "/", session }: Options = {}) {
    return mount(
        [{ element: <SessionRoot />, children: [{ path: "*", element: ui }] }],
        route,
        session,
    );
}

export const sessions = {
    maria: {
        user: { id: "u-maria", role: "patient" },
        profile: {
            kind: "patient",
            displayName: "Maria Aparecida da Silva",
            referencePharmacy: { id: "ph-centro", name: "UBS Centro" },
        },
    },
    ana: {
        user: { id: "u-ana", role: "pharmacy_staff" },
        profile: {
            kind: "pharmacy_staff",
            fullName: "Ana Beatriz Rocha",
            occupation: "pharmacist",
            pharmacy: { id: "ph-centro", name: "UBS Centro" },
        },
    },
    carlos: {
        user: { id: "u-carlos", role: "courier" },
        profile: { kind: "courier", fullName: "Carlos Eduardo Lima" },
    },
} satisfies Record<string, TestSession>;

export const supplierSession: TestSession = {
    user: { id: "u-forn", role: "supplier_staff" },
    profile: {
        kind: "supplier_staff",
        fullName: "Ricardo Alves",
        supplier: { id: "s1", name: "Distribuidora Farma Paulista" },
    },
};

export const managerSession: TestSession = {
    user: { id: "u-gestor", role: "manager" },
    profile: { kind: "manager", fullName: "Gestão da rede" },
};
