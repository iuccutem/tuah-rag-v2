import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// The app is deployed under a subpath on the university host
// (tuah.utem.edu.my/rag-builder/). BASE_PATH is baked in at build time.
// Local dev defaults to "/".
const basePath = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    TanStackRouterVite({
      routesDirectory: "src/routes",
      generatedRouteTree: "src/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_URL ?? "http://127.0.0.1:6699",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_URL ?? "http://127.0.0.1:6699",
        changeOrigin: true,
      },
    },
  },
});
