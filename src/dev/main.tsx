import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { DevPage } from "./DevPage";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element in dev.html");

createRoot(rootEl).render(
  <StrictMode>
    <DevPage />
  </StrictMode>,
);
