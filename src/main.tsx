import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import "./styles/selector-scroll.css";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";

createRoot(
  document.getElementById("root")!
).render(

  <StrictMode>

    <AuthProvider>

      <App />

    </AuthProvider>

  </StrictMode>

);