import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListDetail } from "./ListDetail";
import { AppHeader } from "../AppHeader/AppHeader";
import { expectNoAxeViolations } from "../../../test/setup";

describe("ListDetail e AppHeader", () => {
    it("lista com rótulo e detalhe; topo com título", async () => {
        const { container } = render(
            <>
                <AppHeader
                    title="UBS Centro"
                    subtitle="Ana Beatriz Rocha, farmacêutica"
                    actions={<button type="button">Sair</button>}
                />
                <main>
                    <ListDetail
                        listLabel="Fila de pedidos"
                        list={<p>itens</p>}
                        detail={<p>detalhe</p>}
                    />
                </main>
            </>,
        );
        expect(screen.getByRole("region", { name: "Fila de pedidos" })).toBeInTheDocument();
        expect(screen.getByRole("banner")).toHaveTextContent("UBS Centro");
        await expectNoAxeViolations(container);
    });
});
