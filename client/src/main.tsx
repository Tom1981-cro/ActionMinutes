import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./theme/themes.css";
import "./theme/demo-utilities.css";
import { initTheme } from "./theme/theme";
import { ThemeProvider } from "./theme/ThemeProvider";

initTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
