import type { RequestHandler } from "express";
import { ok } from "../lib.js";
import * as designs from "../services/design.service.js";
import { designDto } from "../models/design.model.js";
export const create: RequestHandler = async (req, res) =>
  ok(
    res,
    await designs.createDesign(req.identity!.userId, req.validated.body),
    201,
  );
export const list: RequestHandler = async (req, res) => {
  const { items, pagination } = await designs.listDesigns(
    req.identity!.userId,
    req.validated.query,
  );
  ok(res, items, 200, pagination);
};
export const get: RequestHandler = async (req, res) =>
  ok(
    res,
    designDto(
      await designs.ownedDesign(req.validated.params.id, req.identity!.userId),
    ),
  );
export const update: RequestHandler = async (req, res) =>
  ok(
    res,
    await designs.updateDesign(
      req.validated.params.id,
      req.identity!.userId,
      req.validated.body,
    ),
  );
export const remove: RequestHandler = async (req, res) =>
  ok(
    res,
    await designs.deleteDesign(req.validated.params.id, req.identity!.userId),
  );
