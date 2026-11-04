import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fatec-pi/style-guide/styles.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
