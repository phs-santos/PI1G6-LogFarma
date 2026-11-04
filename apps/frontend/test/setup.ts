import "@testing-library/jest-dom/vitest";
import { afterEach, expect, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { axe } from "vitest-axe";

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

/** Contraste fica para o Playwright (o jsdom não calcula cor). */
export async function expectNoAxeViolations(container: Element): Promise<void> {
    const results = await axe(container, { rules: { "color-contrast": { enabled: false } } });
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}
