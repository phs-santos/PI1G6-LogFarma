import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            // No Docker (infra/compose.yaml) o backend é http://backend:3333.
            "/api": process.env.API_PROXY_TARGET ?? "http://localhost:3333",
        },
    },
});
