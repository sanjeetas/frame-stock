import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import type { Config } from "../config/env.js";
import type { AuthService } from "../services/auth.service.js";
import { authenticate, authorizeRoles } from "../middleware/authenticate.js";
import { validate } from "../middleware/validate.js";
import { csrf } from "../middleware/csrf.js";
import * as s from "../schemas/index.js";
import * as catalog from "../controllers/catalog.controller.js";
import * as orders from "../controllers/order.controller.js";
import * as designs from "../controllers/design.controller.js";
import * as files from "../services/file.service.js";
import { ok } from "../lib.js";
export function resourceRoutes(auth: AuthService, config: Config) {
  const r = Router(),
    identity = authenticate(auth),
    roles = authorizeRoles("admin"),
    protect = csrf(config).protect;
  const writeLimit = rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many changes. Please wait a minute.",
      },
    },
  });
  r.get("/products", validate({ query: s.productQuery }), catalog.list);
  r.get("/products/:id", validate({ params: s.idParams }), catalog.get);
  r.use("/orders", identity);
  r.get("/orders", validate({ query: s.orderQuery }), orders.list);
  r.post(
    "/orders",
    protect,
    writeLimit,
    validate({ body: s.orderBody }),
    orders.create,
  );
  r.get("/orders/:id", validate({ params: s.idParams }), orders.get);
  r.patch(
    "/orders/:id/cancel",
    protect,
    validate({ params: s.idParams, body: z.object({}).strict() }),
    orders.cancel,
  );
  r.get(
    "/orders/:id/download/:itemIndex",
    validate({ params: s.downloadParams }),
    async (req, res) => {
      const f = await files.downloadFile(
        req.validated.params.id,
        req.validated.params.itemIndex,
        req.identity!.userId,
      );
      res.set("Cache-Control", "no-store");
      res.download(f.path, f.name);
    },
  );
  r.use("/designs", identity);
  r.get("/designs", validate({ query: s.pagination.strict() }), designs.list);
  r.post(
    "/designs",
    protect,
    writeLimit,
    validate({ body: s.designBody }),
    designs.create,
  );
  r.get("/designs/:id", validate({ params: s.idParams }), designs.get);
  r.patch(
    "/designs/:id",
    protect,
    writeLimit,
    validate({ params: s.idParams, body: s.designBody }),
    designs.update,
  );
  r.delete(
    "/designs/:id",
    protect,
    validate({ params: s.idParams }),
    designs.remove,
  );
  r.use("/admin", identity, roles);
  r.get(
    "/admin/products",
    validate({ query: s.productQuery }),
    catalog.adminList,
  );
  r.post(
    "/admin/products",
    protect,
    writeLimit,
    validate({ body: s.productBody }),
    catalog.create,
  );
  r.patch(
    "/admin/products/:id",
    protect,
    writeLimit,
    validate({ params: s.idParams, body: s.productBody }),
    catalog.update,
  );
  r.delete(
    "/admin/products/:id",
    protect,
    validate({ params: s.idParams }),
    catalog.hide,
  );
  r.post(
    "/admin/products/:id/file",
    protect,
    writeLimit,
    validate({ params: s.idParams, query: s.filenameQuery }),
    express.raw({ type: "application/octet-stream", limit: "20mb" }),
    async (req, res) =>
      ok(
        res,
        await files.saveOriginal(
          req.validated.params.id,
          req.body,
          req.validated.query.filename,
          config,
        ),
      ),
  );
  r.post(
    "/admin/products/:id/preview",
    protect,
    writeLimit,
    validate({ params: s.idParams }),
    express.raw({ type: "application/octet-stream", limit: "8mb" }),
    async (req, res) =>
      ok(
        res,
        await files.savePreview(req.validated.params.id, req.body, config),
      ),
  );
  r.get("/admin/orders", validate({ query: s.orderQuery }), orders.adminList);
  r.patch(
    "/admin/orders/:id",
    protect,
    writeLimit,
    validate({ params: s.idParams, body: s.orderStatus }),
    orders.adminUpdate,
  );
  return r;
}
