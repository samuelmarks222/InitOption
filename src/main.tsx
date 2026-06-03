import { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import App from "./App.tsx";
import "./index.css";
import i18n from "./i18n/index.ts";

declare global {
  interface Window {
    __INITOPTION_BOOT_STATUS__?: "preboot" | "imported" | "rendering" | "mounted";
  }
}

if (typeof window !== "undefined") {
  window.__INITOPTION_BOOT_STATUS__ = "imported";
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element '#root' was not found.");
}

if (typeof window !== "undefined") {
  window.__INITOPTION_BOOT_STATUS__ = "rendering";
}

createRoot(rootElement).render(
  <Suspense fallback={<div />}>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </Suspense>
);

if (typeof window !== "undefined") {
  window.requestAnimationFrame(() => {
    if (rootElement.childElementCount > 0) {
      window.__INITOPTION_BOOT_STATUS__ = "mounted";
    }
  });
}
