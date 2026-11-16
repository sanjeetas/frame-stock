import type { RequestHandler } from "express";
import type { Config } from "../config/env.js";
import type { AuthService } from "../services/auth.service.js";
import { cookieOptions } from "../middleware/csrf.js";
import { ok } from "../lib.js";
export function authController(auth: AuthService, config: Config) {
  const accessOptions = {
    ...cookieOptions(config),
    maxAge: config.ACCESS_TOKEN_TTL_SECONDS * 1000,
  };
  const refreshOptions = { ...cookieOptions(config), path: "/api/auth" };
  const register: RequestHandler = async (req, res) =>
    ok(res, { user: await auth.register(req.validated.body) }, 201);
  const login: RequestHandler = async (req, res) => {
    const result = await auth.login(req.validated.body);
    res.cookie("phulo_access", result.access, accessOptions);
    res.cookie("phulo_refresh", result.refresh, {
      ...refreshOptions,
      expires: result.expiresAt,
    });
    ok(res, { user: result.user });
  };
  const refresh: RequestHandler = async (req, res) => {
    try {
      const result = await auth.refresh(req.cookies?.phulo_refresh);
      res.cookie("phulo_access", result.access, accessOptions);
      res.cookie("phulo_refresh", result.refresh, {
        ...refreshOptions,
        expires: result.expiresAt,
      });
      ok(res, { refreshed: true });
    } catch (e) {
      res.clearCookie("phulo_access", cookieOptions(config));
      res.clearCookie("phulo_refresh", refreshOptions);
      throw e;
    }
  };
  const logout: RequestHandler = async (req, res) => {
    await auth.logout(req.cookies?.phulo_refresh, req.cookies?.phulo_access);
    res.clearCookie("phulo_access", cookieOptions(config));
    res.clearCookie("phulo_refresh", refreshOptions);
    ok(res, { loggedOut: true });
  };
  const me: RequestHandler = async (req, res) => {
    const result = await auth.verify(req.cookies?.phulo_access);
    ok(res, { user: result.user });
  };
  return { register, login, refresh, logout, me };
}
