import { expect, test, type Page } from "@playwright/test";
import {
    expectNoAxe,
    expectNoHorizontalScroll,
    isoDaysFromToday,
    loginAs,
    reseed,
} from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeEach(() => reseed());

async function searchAndOpen(page: Page, text: string, option: RegExp) {
    await page.goto("/buscar");
    await page.getByRole("combobox", { name: "Qual remédio você precisa?" }).fill(text);
    await page.getByRole("option", { name: option }).click();
}

async function openRequestInQueue(page: Page, text: RegExp) {
    await page.goto("/farmacia/pedidos");
    await page
        .getByRole("region", { name: "Fila de pedidos" })
        .getByRole("link", { name: text })
        .click();
    return page.getByRole("region", { name: "Pedido aberto" });
}

test("Cena 1: Dona Maria descobre onde tem losartana", async ({ browser }) => {
    const maria = await loginAs(browser, "maria@demo.logfarma", { mobile: true });
    await expect(maria.getByRole("heading", { level: 1, name: "Olá, Maria" })).toBeVisible();
    await expectNoAxe(maria);
    await maria.getByRole("link", { name: "Procurar remédio" }).click();
    await searchAndOpen(maria, "losartana", /Losartana/);
    await expect(maria.getByText("A UBS Centro está sem")).toBeVisible();
    await expect(maria.getByText("Tem na UBS Jardim São Sebastião")).toBeVisible();
    await expect(maria.getByText(/A [\d,]+ km de você/).first()).toBeVisible();
    await expectNoAxe(maria);
    await maria.getByRole("link", { name: "Vou buscar lá" }).click();
    await expect(maria.getByRole("link", { name: "Abrir o caminho no mapa" })).toHaveAttribute(
        "href",
        /^https:\/\/www\.google\.com\/maps\//,
    );
});

test("Cena 2: transferência da Jardim e entrega em casa", async ({ browser }) => {
    const maria = await loginAs(browser, "maria@demo.logfarma", { mobile: true });
    await searchAndOpen(maria, "losartana", /Losartana/);
    await maria.getByRole("link", { name: "Não consigo ir — receber em casa" }).click();
    await expect(maria.getByRole("radio", { name: /^Receita de / })).toBeChecked();
    await maria.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(maria).toHaveURL(/\/pedidos\/[\w-]+$/);
    await expect(maria.getByRole("list", { name: "Situação do pedido" })).toBeVisible();
    await expectNoAxe(maria);

    const centro = await loginAs(browser, "farmaceutico.centro@demo.logfarma");
    let detail = await openRequestInQueue(centro, /Losartana/);
    await detail.getByRole("button", { name: "Conferir receita" }).click();
    await expect(detail.getByText("Receita conferida.")).toBeVisible();
    await expectNoAxe(centro);
    await detail.getByRole("button", { name: "Pedir à UBS Jardim São Sebastião" }).click();
    await expect(detail.getByText("Em transferência")).toBeVisible();

    const jardim = await loginAs(browser, "farmaceutico.jardim@demo.logfarma");
    await jardim.goto("/farmacia/transferencias");
    const paraNos = jardim.getByRole("table", { name: "Pedidos para nós" });
    await paraNos.getByRole("button", { name: "Enviar" }).click();
    await expect(paraNos.getByText("Enviado")).toBeVisible();

    await centro.goto("/farmacia/transferencias");
    const nossos = centro.getByRole("table", { name: "Nossos pedidos" });
    await nossos.getByRole("button", { name: "Recebido" }).click();
    await expect(nossos.getByText("Recebido")).toBeVisible();
    detail = await openRequestInQueue(centro, /Losartana/);
    await detail.getByRole("button", { name: "Agendar entrega" }).first().click();
    await detail
        .getByRole("form", { name: "Agendar entrega" })
        .getByRole("button", { name: "Agendar entrega" })
        .click();
    await expect(detail.getByText("Entrega agendada").first()).toBeVisible();

    const carlos = await loginAs(browser, "entregador1@demo.logfarma", { mobile: true });
    await expect(
        carlos.getByText("Refrigerado").or(carlos.getByText("Centro, Taquaritinga")).first(),
    ).toBeVisible();
    await expectNoAxe(carlos);
    await carlos.getByRole("button", { name: "Aceitar entrega" }).first().click();
    await expect(
        carlos.getByRole("heading", { level: 1, name: "Maria Aparecida da Silva" }),
    ).toBeVisible();
    await carlos.getByRole("button", { name: "Retirei na unidade" }).click();
    await carlos.getByRole("button", { name: "Entreguei" }).click();
    await carlos.getByLabel("Nome de quem recebeu").fill("Maria Aparecida");
    await carlos.getByRole("button", { name: "Confirmar entrega" }).click();
    await expect(carlos.getByText("Entregue a Maria Aparecida.")).toBeVisible();

    // Sem recarregar: a tela da Maria se atualiza sozinha.
    const atual = maria
        .getByRole("list", { name: "Situação do pedido" })
        .locator('[aria-current="step"]');
    await expect(atual).toContainText("Entregue", { timeout: 15_000 });
    await maria.goto("/");
    await expect(maria.getByRole("status").getByText("Entregue", { exact: true })).toBeVisible();
});

test("Cena 3: adalimumabe em falta, compra ao fornecedor e fila de espera", async ({ browser }) => {
    const maria = await loginAs(browser, "maria@demo.logfarma", { mobile: true });
    await searchAndOpen(maria, "adalim", /Adalimumabe/);
    await expect(maria.getByText("Este remédio está em falta na rede")).toBeVisible();
    await maria.getByRole("link", { name: "Pedir assim mesmo" }).click();
    await expect(
        maria.getByRole("radiogroup", { name: "Quando chegar, como você quer receber?" }),
    ).toBeVisible();
    await maria.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(maria).toHaveURL(/\/pedidos\/[\w-]+$/);
    const pedidoMaria = maria.url();

    const esp = await loginAs(browser, "farmaceutico.especializados@demo.logfarma");
    const detail = await openRequestInQueue(esp, /Maria Aparecida/);
    await detail.getByRole("button", { name: "Pedir ao fornecedor" }).click();
    await detail
        .getByRole("form", { name: "Pedir ao fornecedor" })
        .getByRole("button")
        .first()
        .click();
    await expect(detail.getByText("Lista de espera", { exact: true })).toBeVisible();

    const fornecedor = await loginAs(browser, "fornecedor@demo.logfarma");
    await expectNoAxe(fornecedor);
    const row = fornecedor.getByRole("row").filter({ hasText: "Adalimumabe" });
    await row.getByRole("button", { name: "Confirmar prazo" }).click();
    await fornecedor.getByLabel("Data prevista de entrega").fill(isoDaysFromToday(7));
    await fornecedor.getByRole("button", { name: "Confirmar data" }).click();
    await expect(row.getByText(/Prazo confirmado/)).toBeVisible();
    await row.getByRole("button", { name: "Enviar" }).click();
    await fornecedor.getByLabel("Nota fiscal").fill("NF 4521");
    await fornecedor.getByLabel("Lote").fill("ADA-9001");
    await fornecedor.getByLabel("Validade").fill(isoDaysFromToday(300));
    await fornecedor.getByLabel("Quantidade enviada").fill("2");
    await fornecedor.getByRole("button", { name: "Confirmar envio" }).click();
    await expect(row.getByText("Enviado pelo fornecedor")).toBeVisible();

    await esp.goto("/farmacia/compras");
    const compra = esp.getByRole("row").filter({ hasText: "Adalimumabe" });
    await compra.getByRole("button", { name: "Dar entrada" }).click();
    await expect(compra.getByText("Recebido")).toBeVisible();
    await compra.getByRole("button", { name: /Ver fila/ }).click();
    const fila = esp.getByRole("table", { name: /Fila de espera/ });
    await expect(fila.getByText("Rafael Souza Lima")).toBeVisible();
    await expect(fila.getByText("Menos de 60 anos")).toBeVisible();

    await maria.goto(pedidoMaria);
    await expect(
        maria.getByRole("list", { name: "Situação do pedido" }).locator('[aria-current="step"]'),
    ).toContainText("Chegou na Farmácia de Medicamentos Especializados");

    const gestor = await loginAs(browser, "gestor@demo.logfarma");
    await expect(gestor.getByText(/^Adalimumabe.*: \d+$/)).toBeVisible();
    await expectNoAxe(gestor);
});

test("Celular estreito e letra em 200%: nada rola para o lado", async ({ browser }) => {
    const maria = await loginAs(browser, "maria@demo.logfarma", { mobile: true, bigText: true });
    for (const path of ["/", "/buscar", "/pedidos", "/avisos", "/meus-dados"]) {
        await maria.goto(path);
        await expect(maria.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoHorizontalScroll(maria);
    }
    await searchAndOpen(maria, "losartana", /Losartana/);
    await expect(maria.getByText("Tem na UBS Jardim São Sebastião")).toBeVisible();
    await expectNoHorizontalScroll(maria);
    await maria.getByRole("link", { name: "Não consigo ir — receber em casa" }).click();
    await expect(maria.getByRole("button", { name: "Confirmar pedido" })).toBeVisible();
    await expectNoHorizontalScroll(maria);

    const carlos = await loginAs(browser, "entregador1@demo.logfarma", {
        mobile: true,
        bigText: true,
    });
    await expect(carlos.getByRole("heading", { level: 1, name: "Entregas" })).toBeVisible();
    await expectNoHorizontalScroll(carlos);
});
