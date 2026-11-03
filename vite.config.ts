import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
const internalOTC = () => ({
  name: "serverless-otc-api",
  configureServer(server: any) {
    server.middlewares.use(async (req: any, res: any, next: () => void) => {
      if (req.url?.split("?")[0] !== "/api/otc") return next();
      try {
        const { default: handler } = await server.ssrLoadModule("/api/_lib/otcHandler.ts");
        await handler(req, res);
      } catch (error) {
        console.error("Local OTC API failed:", error);
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "OTC database unavailable. Configure DATABASE_URL.",
          }),
        );
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (!process.env.DATABASE_URL && env.DATABASE_URL)
    process.env.DATABASE_URL = env.DATABASE_URL;
  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      allowedHosts: true,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      internalOTC(),
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        buffer: "buffer",
        crypto: "crypto-browserify",
        stream: "stream-browserify",
        util: "util",
        process: "process/browser",
      },
    },
    define: {
      global: "globalThis",
      // Vite replaces process.env for browser builds, but preserves it for the local API.
      "process.version": '"v18.0.0"',
      "process.platform": '"browser"',
    },
  };
});
