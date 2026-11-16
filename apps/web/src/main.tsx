import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
