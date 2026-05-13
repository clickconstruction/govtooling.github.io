import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";
import { GeneratorPage } from "./GeneratorPage";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element in generator.html");

createRoot(rootEl).render(
  <StrictMode>
    <GeneratorPage />
  </StrictMode>,
);
