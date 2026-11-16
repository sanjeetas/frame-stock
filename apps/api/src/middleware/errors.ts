import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib.js";
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) return;
  let status = 500,
    code = "INTERNAL_ERROR",
    message = "Something went wrong. Please try again.";
  let issues: unknown;
  if (error instanceof AppError) {
    ({ status, code, message } = error);
  } else if (error instanceof ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Please check the submitted fields.";
    issues = error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
  } else if (error?.code === 11000) {
    status = 409;
    code = "CONFLICT";
    message = "This record already exists.";
  } else if (error?.type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request exceeds the allowed size.";
  } else if (error instanceof SyntaxError && "body" in error) {
    status = 400;
    code = "INVALID_JSON";
    message = "Invalid JSON body.";
  }
  res.status(status).json({
    success: false,
    error: { code, message, ...(issues ? { issues } : {}) },
  });
};
