import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { requestPersistentStorage } from "./db/db";
import { listenForInstallPrompt } from "./pwa/install";
import "./styles/base.css";

requestPersistentStorage();
listenForInstallPrompt();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
