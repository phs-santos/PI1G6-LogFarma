import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp, sessions } from "../../../test/render";
import { mockApi, type MockHandler } from "../../../test/mockApi";
import { losartana, networkCena2, pharmacyItem, stockOf } from "../../../test/fixtures";
import type { PharmacyRequestItem } from "../../api/types";
import { expectNoAxeViolations } from "../../../test/setup";

function api(items: PharmacyRequestItem[], over: Record<string, MockHandler> = {}) {
    return mockApi({
        "GET /api/pharmacy/requests": { body: { items } },
        "GET /api/pharmacy/stock": { body: { items: [stockOf(losartana, 200)] } },
        "GET /api/pharmacy/network-availability": { body: { items: networkCena2 } },
        "GET /api/pharmacy/transfers": { body: { items: [] } },
        "GET /api/pharmacy/purchase-orders": { body: { items: [] } },
        "GET /api/suppliers": { body: { items: [] } },
        ...over,
    });
}

describe("Farmácia — Pedidos", () => {
    it("detalhe mostra Cartão SUS e endereço só para entrega", async () => {
        api([pharmacyItem()]);
        const { container } = renderApp({
            route: "/farmacia/pedidos/req-1",
            session: sessions.ana,
        });
        const detail = await screen.findByRole("region", { name: "Pedido aberto" });
        expect(await within(detail).findByText("898 0012 3456 7890")).toBeInTheDocument();
        expect(
            within(detail).getByText("Rua Sete de Setembro, 50 — Centro, Taquaritinga/SP"),
        ).toBeInTheDocument();
        expect(within(detail).getByText("Joana da Silva (filha)")).toBeInTheDocument();
        expect(
            await within(detail).findByText(
                "Tem na UBS Jardim São Sebastião (120) e na UBS Vila Negri (25)",
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "Áreas da farmácia" })).toBeInTheDocument();
        await expectNoAxeViolations(container);
    });

    it("retirada não mostra o endereço", async () => {
        api([pharmacyItem({ fulfillment: "pickup" })]);
        renderApp({ route: "/farmacia/pedidos/req-1", session: sessions.ana });
        const detail = await screen.findByRole("region", { name: "Pedido aberto" });
        await within(detail).findByText("898 0012 3456 7890");
        expect(within(detail).queryByText(/Rua Sete de Setembro/)).not.toBeInTheDocument();
    });

    it('Separar fica "Enviando…" e envia uma vez em duplo clique', async () => {
        let release: () => void = () => undefined;
        const mock = api([pharmacyItem()], {
            "POST /api/pharmacy/requests/req-1/actions": () =>
                new Promise((resolve) => {
                    release = () =>
                        resolve({
                            body: { request: pharmacyItem({ status: "ready_for_pickup" }).request },
                        });
                }),
        });
        renderApp({ route: "/farmacia/pedidos/req-1", session: sessions.ana });
        const separar = await screen.findByRole("button", { name: "Separar" });
        await userEvent.setup().dblClick(separar);
        expect(await screen.findByRole("button", { name: "Enviando…" })).toBeDisabled();
        release();
        await waitFor(() =>
            expect(mock.calls.filter((c) => c.method === "POST")).toEqual([
                {
                    method: "POST",
                    path: "/api/pharmacy/requests/req-1/actions",
                    body: { action: "prepare" },
                },
            ]),
        );
    });

    it("lista a fila e abre o pedido ao escolher", async () => {
        api([pharmacyItem(), pharmacyItem({ id: "req-2", status: "waitlisted" })]);
        const { router } = renderApp({ route: "/farmacia/pedidos", session: sessions.ana });
        const fila = await screen.findByRole("region", { name: "Fila de pedidos" });
        const links = await within(fila).findAllByRole("link");
        expect(links).toHaveLength(2);
        await userEvent.setup().click(links[1]!);
        await waitFor(() => expect(router.state.location.pathname).toBe("/farmacia/pedidos/req-2"));
    });

    it("entregar no balcão para a responsável envia caregiverId", async () => {
        const mock = api([pharmacyItem({ status: "ready_for_pickup", fulfillment: "pickup" })], {
            "POST /api/pharmacy/requests/req-1/actions": {
                body: { request: pharmacyItem().request },
            },
        });
        renderApp({ route: "/farmacia/pedidos/req-1", session: sessions.ana });
        const user = userEvent.setup();
        await user.click(await screen.findByRole("button", { name: "Entregar no balcão" }));
        await user.click(screen.getByRole("radio", { name: "Joana da Silva (filha)" }));
        await user.click(screen.getByRole("button", { name: "Confirmar entrega no balcão" }));
        await waitFor(() =>
            expect(mock.calls.find((c) => c.method === "POST")?.body).toEqual({
                action: "dispense",
                pickedUpBy: "caregiver",
                caregiverId: "cg-1",
            }),
        );
    });
});
