import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { axe } from "vitest-axe";

afterEach(() => cleanup());

/** Falha o teste se o axe encontrar qualquer violação de acessibilidade no container. */
export async function expectNoAxeViolations(container: Element): Promise<void> {
    // color-contrast depende de layout real; o contraste é garantido pelos tokens e checado no Playwright.
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
