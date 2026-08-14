import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { BackendProvider } from "./state/backend-context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BackendProvider>
      <App />
    </BackendProvider>
  </StrictMode>,
);
