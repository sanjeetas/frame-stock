import { pipeline } from "node:stream/promises";
import { bucket, storageStatus } from "../services/blob.service.js";
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
import {
  ownedImage,
  uploadDesignImage,
} from "../services/design-image.service.js";
import { Product } from "../models/product.model.js";
import { AppError } from "../lib.js";
import { createOrder } from "../services/order.service.js";
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
  r.get("/library", validate({ query: s.productQuery }), async (req, res) => {
    req.validated.query.group = "Image Library";
    await catalog.list(req, res, () => {});
  });
  r.get("/library/categories", async (_req, res) =>
    ok(
      res,
      await Product.distinct("libraryCategory", {
        published: true,
        libraryCategory: { $exists: true },
      }),
    ),
  );
  r.post(
    "/library/:id/license",
    identity,
    protect,
    writeLimit,
    validate({
      params: s.idParams,
      body: z
        .object({
          name: z.string().trim().min(2).max(100),
          phone: z.string().regex(/^\+?[\d ()-]{8,20}$/),
        })
        .strict(),
    }),
    async (req, res) => {
      const product = await Product.findOne({
        _id: req.validated.params.id,
        published: true,
        libraryCategory: { $exists: true },
      });
      if (!product || !product.hasFile)
        throw new AppError(
          409,
          "UNAVAILABLE",
          "This original is not available for licensing yet.",
        );
      ok(
        res,
        await createOrder(req.identity!.userId, {
          ...req.validated.body,
          address: "",
          notes: "Image Library HD license request",
          items: [
            {
              productId: String(product._id),
              quantity: 1,
              customization: {
                requirements: "HD digital illustration license",
              },
            },
          ],
        }),
        201,
      );
    },
  );
  r.post(
    "/design-images",
    identity,
    protect,
    writeLimit,
    express.raw({ type: "application/octet-stream", limit: "8mb" }),
    async (req, res) =>
      ok(
        res,
        await uploadDesignImage(req.identity!.userId, req.body, config),
        201,
      ),
  );
  r.get(
    "/design-images/:id",
    identity,
    validate({ params: s.idParams }),
    async (req, res) => {
      const image = await ownedImage(
        req.validated.params.id,
        req.identity!.userId,
      );
      res.type("image/png");
      res.set("Cache-Control", "private, no-store");
      await pipeline(
        bucket("previews").openDownloadStream(image.gridfsId),
        res,
      );
    },
  );
  r.get("/categories", catalog.categories);
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
    async (req, res, next) => {
      const f = await files.downloadFile(
        req.validated.params.id,
        req.validated.params.itemIndex,
        req.identity!.userId,
      );
      res.set("Cache-Control", "no-store");
      res.attachment(f.name);
      res.type("application/octet-stream");
      await pipeline(
        bucket("originals").openDownloadStream(f.gridfsId),
        res,
      ).catch((error) => {
        if (res.headersSent) res.destroy();
        else next(error);
      });
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
  r.get("/admin/storage", async (_req, res) =>
    ok(res, await storageStatus(config)),
  );
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
  r.delete(
    "/admin/products/:id/file",
    protect,
    validate({ params: s.idParams }),
    async (req, res) =>
      ok(res, await files.deleteOriginal(req.validated.params.id)),
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
