import type { Config } from "./env.js";

// Local aliases are available only during development. Production accepts
// exclusively the configured frontend; arbitrary ports and LAN hosts stay blocked.
export function isAllowedOrigin(origin: string | undefined, config: Config): boolean {
  if (!origin) return false;
  if (origin === config.FRONTEND_ORIGIN) return true;
  return config.NODE_ENV === "development" &&
    (origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173");
}
