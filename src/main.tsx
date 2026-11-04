import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app";
import { initTheme } from "@/hooks/use-theme";

import "@/index.css";

initTheme();

const container = document.querySelector("#root");

if (!container) {
  throw new Error("Root container not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
