// Web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
    server: {
        port: 5173,
        proxy: {
            "/api": { target: "https://localhost:7029", changeOrigin: true, secure: false },
            "/hub": { target: "https://localhost:7029", changeOrigin: true, ws: true, secure: false },
        },
    },
});
