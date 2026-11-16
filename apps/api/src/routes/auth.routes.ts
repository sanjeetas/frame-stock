import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { Config } from "../config/env.js";
import type { AuthService } from "../services/auth.service.js";
import { authController } from "../controllers/auth.controller.js";
import { csrf } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { loginBody, registerBody } from "../schemas/index.js";
export function authRoutes(auth: AuthService, config: Config) {
  const router = Router(),
    c = authController(auth, config),
    guard = csrf(config);
  const limiter = rateLimit({
    windowMs: 15 * 60000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Try again later.",
      },
    },
  });
  const refreshLimit = rateLimit({
    windowMs: 60000,
    limit: 40,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many session requests." },
    },
  });
  router.get("/csrf", refreshLimit, guard.issue);
  router.post(
    "/register",
    limiter,
    guard.protect,
    validate({ body: registerBody }),
    c.register,
  );
  router.post(
    "/login",
    limiter,
    guard.protect,
    validate({ body: loginBody }),
    c.login,
  );
  router.post(
    "/refresh",
    refreshLimit,
    guard.protect,
    validate({ body: z.object({}).strict() }),
    c.refresh,
  );
  router.post(
    "/logout",
    refreshLimit,
    guard.protect,
    validate({ body: z.object({}).strict() }),
    c.logout,
  );
  router.get("/me", authenticate(auth), c.me);
  return router;
}
