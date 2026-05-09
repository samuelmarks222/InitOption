import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, "/");

          if (!normalizedId.includes("/node_modules/")) return;

          if (
            normalizedId.includes("/react/") ||
            normalizedId.includes("/react-dom/") ||
            normalizedId.includes("/react-router-dom/") ||
            normalizedId.includes("/react-is/")
          ) {
            return "vendor-react";
          }

          if (
            normalizedId.includes("/clsx/") ||
            normalizedId.includes("/class-variance-authority/") ||
            normalizedId.includes("/tailwind-merge/") ||
            normalizedId.includes("/next-themes/")
          ) {
            return "vendor-ui";
          }

          if (normalizedId.includes("/lightweight-charts/")) return "vendor-lightweight-charts";
          if (normalizedId.includes("/technicalindicators/")) return "vendor-indicators";
          if (normalizedId.includes("/recharts/")) return "vendor-recharts";

          if (
            normalizedId.includes("/@supabase/") ||
            normalizedId.includes("/@tanstack/")
          ) {
            return "vendor-data";
          }

          if (
            normalizedId.includes("/@radix-ui/") ||
            normalizedId.includes("/cmdk/") ||
            normalizedId.includes("/vaul/") ||
            normalizedId.includes("/embla-carousel-react/") ||
            normalizedId.includes("/sonner/")
          ) {
            return "vendor-ui";
          }

          if (
            normalizedId.includes("/react-hook-form/") ||
            normalizedId.includes("/@hookform/") ||
            normalizedId.includes("/zod/") ||
            normalizedId.includes("/react-day-picker/") ||
            normalizedId.includes("/input-otp/")
          ) {
            return "vendor-forms";
          }

          if (
            normalizedId.includes("/lucide-react/") ||
            normalizedId.includes("/react-world-flags/")
          ) {
            return "vendor-icons";
          }
        },
      },
    },
  },
}));
