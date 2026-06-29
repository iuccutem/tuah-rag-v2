// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// When self-hosting (e.g. on tuah.utem.edu.my/rag-builder under Node),
// set DEPLOY_TARGET=node and BASE_PATH=/rag-builder/ at build time:
//   DEPLOY_TARGET=node BASE_PATH=/rag-builder/ bun run build
// Inside Lovable's own build, these vars are unset so the Cloudflare preset
// is used as usual (Lovable forces the preset internally anyway).
const isNodeSelfHost = process.env.DEPLOY_TARGET === "node";
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(isNodeSelfHost
    ? {
        nitro: {
          preset: "node-server",
          output: {
            dir: "dist",
            serverDir: "dist/server",
            publicDir: "dist/public",
          },
        },
      }
    : {}),
  vite: {
    base: basePath,
  },
});
