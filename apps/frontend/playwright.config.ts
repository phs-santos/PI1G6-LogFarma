import { defineConfig, devices } from "@playwright/test";
import { ensureDatabase } from "./e2e/ensure-database";

// Banco e portas próprios: o e2e nunca toca no banco de dev (5173/3333).
export const E2E_DATABASE_URL = "postgres://pi:pi@localhost:5432/pi_e2e";
const API_PORT = 3334;
const WEB_PORT = 5174;

ensureDatabase(E2E_DATABASE_URL);

export default defineConfig({
    testDir: "./e2e",
    workers: 1,
    fullyParallel: false,
    timeout: 90_000,
    expect: { timeout: 10_000 },
    reporter: [["list"]],
    use: {
        baseURL: `http://localhost:${WEB_PORT}`,
        locale: "pt-BR",
        timezoneId: "America/Sao_Paulo",
        trace: "retain-on-failure",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: [
        {
            command: "pnpm --filter @fatec-pi/backend exec tsx src/server.ts",
            url: `http://localhost:${API_PORT}/api/health`,
            reuseExistingServer: false,
            timeout: 60_000,
            env: {
                PORT: String(API_PORT),
                DATABASE_URL: E2E_DATABASE_URL,
                JWT_SECRET: "e2e",
                NODE_ENV: "development",
                CORS_ORIGIN: `http://localhost:${WEB_PORT}`,
            },
        },
        {
            command: `pnpm --filter @fatec-pi/frontend exec vite --port ${WEB_PORT} --strictPort`,
            url: `http://localhost:${WEB_PORT}`,
            reuseExistingServer: false,
            timeout: 60_000,
            env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
        },
    ],
});
