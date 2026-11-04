import { defineConfig } from "vitest/config";

export const TEST_DATABASE_URL =
    process.env.DATABASE_URL_TEST ?? "postgres://pi:pi@localhost:5432/pi_test";

export default defineConfig({
    test: {
        globalSetup: ["./test/global-setup.ts"],
        fileParallelism: false,
        env: {
            NODE_ENV: "test",
            DATABASE_URL: TEST_DATABASE_URL,
            JWT_SECRET: "test-secret",
        },
    },
});
