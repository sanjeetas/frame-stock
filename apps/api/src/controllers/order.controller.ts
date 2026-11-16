import type { RequestHandler } from "express";
import { ok } from "../lib.js";
import * as orders from "../services/order.service.js";
import { orderDto } from "../models/order.model.js";
export const create: RequestHandler = async (req, res) =>
  ok(
    res,
    await orders.createOrder(req.identity!.userId, req.validated.body),
    201,
  );
export const list: RequestHandler = async (req, res) => {
  const { items, pagination } = await orders.listOrders(
    req.validated.query,
    req.identity!.userId,
  );
  ok(res, items, 200, pagination);
};
export const get: RequestHandler = async (req, res) =>
  ok(
    res,
    orderDto(
      await orders.ownedOrder(req.validated.params.id, req.identity!.userId),
    ),
  );
export const cancel: RequestHandler = async (req, res) =>
  ok(
    res,
    await orders.cancelOrder(req.validated.params.id, req.identity!.userId),
  );
export const adminList: RequestHandler = async (req, res) => {
  const { items, pagination } = await orders.listOrders(req.validated.query);
  ok(res, items, 200, pagination);
};
export const adminUpdate: RequestHandler = async (req, res) =>
  ok(
    res,
    await orders.updateOrderStatus(
      req.validated.params.id,
      req.validated.body.status,
    ),
  );
