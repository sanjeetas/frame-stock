import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler, CookieOptions } from "express";
import type { Config } from "../config/env.js";
import { AppError, ok } from "../lib.js";
export const cookieOptions = (config: Config): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.COOKIE_SAME_SITE,
  path: "/api",
});
export function csrf(config: Config) {
  const sign = (nonce: string) =>
    createHmac("sha256", config.CSRF_SECRET).update(nonce).digest("hex");
  const issue: RequestHandler = (_req, res) => {
    const nonce = randomBytes(32).toString("hex");
    res.cookie("phulo_csrf", nonce, {
      ...cookieOptions(config),
      maxAge: 3600000,
    });
    ok(res, { csrfToken: nonce + "." + sign(nonce) });
  };
  const protect: RequestHandler = (req, _res, next) => {
    const cookie = req.cookies?.phulo_csrf,
      token = req.get("x-csrf-token"),
      origin = req.get("origin");
    if (
      origin !== config.FRONTEND_ORIGIN ||
      typeof cookie !== "string" ||
      !token ||
      !/^([a-f0-9]{64})\.([a-f0-9]{64})$/.test(token)
    )
      return next(
        new AppError(403, "CSRF_FAILED", "Refresh the page and try again."),
      );
    const [nonce, sig] = token.split(".");
    if (
      nonce !== cookie ||
      !sig ||
      !timingSafeEqual(
        Buffer.from(sig, "hex"),
        Buffer.from(sign(cookie), "hex"),
      )
    )
      return next(
        new AppError(403, "CSRF_FAILED", "Refresh the page and try again."),
      );
    next();
  };
  return { issue, protect };
}
