import type { RequestHandler } from "express";
import type { ZodType } from "zod";
export function validate(schemas: {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}): RequestHandler {
  return (req, _res, next) => {
    try {
      req.validated = {
        body: schemas.body?.parse(req.body) ?? {},
        query: schemas.query?.parse(req.query) ?? {},
        params: schemas.params?.parse(req.params) ?? {},
      };
      next();
    } catch (e) {
      next(e);
    }
  };
}
