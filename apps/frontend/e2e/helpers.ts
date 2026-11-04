import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { devices, expect, type Browser, type Page } from "@playwright/test";
import { E2E_DATABASE_URL } from "../playwright.config";

/** Senha das contas da demonstração no banco de e2e (pública; só para este banco). */
export const PASSWORD = "demo1234";

const repoRoot = resolve(import.meta.dirname, "../../..");

/** Zera o banco de e2e e carrega a demonstração da Dona Maria. */
export function reseed(): void {
    execFileSync("pnpm", ["--filter", "@fatec-pi/backend", "exec", "tsx", "src/db/seed.ts"], {
        cwd: repoRoot,
        stdio: "pipe",
        env: {
            ...process.env,
            DATABASE_URL: E2E_DATABASE_URL,
            DEMO_PASSWORD: PASSWORD,
            NODE_ENV: "development",
            JWT_SECRET: "e2e",
        },
    });
}

export interface LoginOptions {
    mobile?: boolean;
    /** Letra da página em 200% (pessoa que aumenta a letra do celular). */
    bigText?: boolean;
}

/** Abre um contexto novo (celular de 360 px ou computador) e entra com a conta. */
export async function loginAs(
    browser: Browser,
    email: string,
    opts: LoginOptions = {},
): Promise<Page> {
    const context = await browser.newContext(
        opts.mobile
            ? { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } }
            : { viewport: { width: 1280, height: 860 } },
    );
    if (opts.bigText) {
        await context.addInitScript(() => {
            document.addEventListener("DOMContentLoaded", () => {
                const style = document.createElement("style");
                style.textContent = "html { font-size: 200% !important; }";
                document.head.appendChild(style);
            });
        });
    }
    const page = await context.newPage();
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).not.toHaveURL(/\/entrar/);
    return page;
}

/** Sem violações de WCAG 2.1 A/AA (inclui contraste, que o jsdom não mede). */
export async function expectNoAxe(page: Page): Promise<void> {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    expect(
        results.violations.map(
            (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        ),
    ).toEqual([]);
}

/** Nada rola para o lado. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `rolagem lateral em ${page.url()}`).toBeLessThanOrEqual(0);
}

export function isoDaysFromToday(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
