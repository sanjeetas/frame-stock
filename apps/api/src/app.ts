import { isAllowedOrigin } from "./config/origin.js";
import { pipeline } from "node:stream/promises";
import { bucket } from "./services/blob.service.js";
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { z } from "zod";
import type { Config } from "./config/env.js";
import { AppError, ok } from "./lib.js";
import { errorHandler } from "./middleware/errors.js";
import { createAuthService } from "./services/auth.service.js";
import { authRoutes } from "./routes/auth.routes.js";
import { resourceRoutes } from "./routes/index.js";
export async function createApp(config: Config) {
  const app = express(),
    auth = await createAuthService(config);
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY_HOPS);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-site" },
      contentSecurityPolicy: {
        directives: { imgSrc: ["'self'", "data:", "blob:", "https:"] },
      },
    }),
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || isAllowedOrigin(origin, config)) return cb(null, true);
        cb(new AppError(403, "ORIGIN_FORBIDDEN", "Origin is not allowed."));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
      exposedHeaders: ["Content-Disposition"],
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "256kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests. Try again shortly.",
        },
      },
    }),
  );
  app.get("/api/health", (_req, res) => ok(res, { status: "ok" }));
  app.use("/api/auth", authRoutes(auth, config));
  app.use("/api", resourceRoutes(auth, config));
  app.get("/api/previews/:filename", async (req, res, next) => {
    const name = z
      .string()
      .regex(/^[a-f\d]{32}\.png$/)
      .safeParse(req.params.filename);
    if (!name.success)
      return next(new AppError(404, "NOT_FOUND", "Preview not found."));
    const b = bucket("previews"),
      file = await b.find({ filename: name.data }).next();
    if (!file) throw new AppError(404, "NOT_FOUND", "Preview not found.");
    res.type("image/png");
    await pipeline(b.openDownloadStream(file._id), res).catch((error) => {
      if (res.headersSent) res.destroy();
      else next(error);
    });
  });
  app.use("/api", (_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "Endpoint not found.")),
  );
  const dist = fileURLToPath(new URL("../../web/dist", import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
  }
  app.use((_req, _res, next) =>
    next(new AppError(404, "NOT_FOUND", "Page not found.")),
  );
  app.use(errorHandler);
  return app;
}
