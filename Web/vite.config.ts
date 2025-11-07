/** // Web/vite.config.ts
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
*/

// Web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: { outDir: "dist", emptyOutDir: true, sourcemap: true },
    server: {
        port: 5173,
        proxy: {
            // API
            "/api": {
                target: "https://localhost:7029",
                changeOrigin: true,
                secure: false,
            },

            // SignalR (proxy ALL paths under /hub, including /negotiate and WebSocket upgrade)
            "^/hub/.*": {
                target: "https://localhost:7029",
                changeOrigin: true,
                ws: true,
                secure: false,
                configure(proxy) {
                    proxy.on("proxyReq", (_proxyReq, req) => {
                        // helps you see if Vite is actually proxying
                        console.log("[vite-proxy] ->", req.method, req.url);
                    });
                    proxy.on("error", (err) => {
                        console.error("[vite-proxy] error", err);
                    });
                },
            },
        },
    },
});
