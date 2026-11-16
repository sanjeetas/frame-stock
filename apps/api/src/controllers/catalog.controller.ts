import type { RequestHandler } from "express";
import { ok } from "../lib.js";
import * as products from "../services/product.service.js";
export const list: RequestHandler = async (req, res) => {
  const { items, pagination } = await products.listProducts(
    req.validated.query,
  );
  ok(res, items, 200, pagination);
};
export const get: RequestHandler = async (req, res) =>
  ok(res, await products.getProduct(req.validated.params.id));
export const adminList: RequestHandler = async (req, res) => {
  const { items, pagination } = await products.listProducts(
    req.validated.query,
    true,
  );
  ok(res, items, 200, pagination);
};
export const create: RequestHandler = async (req, res) =>
  ok(res, await products.saveProduct(req.validated.body), 201);
export const update: RequestHandler = async (req, res) =>
  ok(
    res,
    await products.saveProduct(req.validated.body, req.validated.params.id),
  );
export const hide: RequestHandler = async (req, res) =>
  ok(res, await products.hideProduct(req.validated.params.id));

export const categories: RequestHandler = async (_req, res) =>
  ok(res, await products.listCategories());
