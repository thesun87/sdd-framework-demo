// Entry point thật của storefront (T012) — thay khung tối thiểu do T001 dựng.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
