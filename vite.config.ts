import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { createOTCService } from "./server/otc/service.mjs";

const internalOTC = () => ({
  name: "internal-otc-pricing",
  configureServer(server: any) {
    const service = createOTCService({ dataDir: process.env.OTC_DATA_DIR ?? ".otc-data" });
    server.middlewares.use((req: any, res: any, next: () => void) => {
      if (!service.request(req, res)) next();
    });
    server.httpServer?.on("upgrade", (req: any, socket: any, head: any) => { service.upgrade(req, socket, head); });
    server.httpServer?.once("close", () => service.close());
    const close = server.close.bind(server);
    server.close = async () => { service.close(); return close(); };
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [internalOTC(), react(), mode === "development" && componentTagger()].filter(Boolean),
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
    "process.env": {},
    "process.version": '"v18.0.0"',
    "process.platform": '"browser"',
  },
}));
