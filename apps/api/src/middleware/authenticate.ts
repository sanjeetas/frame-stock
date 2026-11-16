import type { RequestHandler } from "express";
import type { AuthService } from "../services/auth.service.js";
import { AppError } from "../lib.js";
export function authenticate(auth: AuthService): RequestHandler {
  return async (req, _res, next) => {
    try {
      const verified = await auth.verify(req.cookies?.phulo_access);
      req.identity = verified.identity;
      next();
    } catch (e) {
      next(e);
    }
  };
}
export function authorizeRoles(...roles: ("user" | "admin")[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.identity)
      return next(new AppError(401, "UNAUTHENTICATED", "Sign in to continue."));
    if (!roles.includes(req.identity.role))
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission to perform this action.",
        ),
      );
    next();
  };
}
export function assertOwner(owner: unknown, userId: string) {
  if (String(owner) !== userId)
    throw new AppError(403, "FORBIDDEN", "You can only access your own data.");
}
