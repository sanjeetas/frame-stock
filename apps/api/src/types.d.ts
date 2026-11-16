import type { Config } from "./config/env.js";
declare global {
  namespace Express {
    interface Request {
      identity?: { userId: string; role: "user" | "admin"; sessionId: string };
      validated: { body: any; query: any; params: any };
    }
  }
}
export {};
