import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { parseConfig } from "../src/config/env.js";
import { isAllowedOrigin } from "../src/config/origin.js";
import { csrf } from "../src/middleware/csrf.js";
import { errorHandler } from "../src/middleware/errors.js";

const config = parseConfig({
  NODE_ENV: "development",
  MONGODB_URI: "mongodb://127.0.0.1/test",
  FRONTEND_ORIGIN: "https://example.invalid",
  ACCESS_TOKEN_SECRET: "a".repeat(48),
  CSRF_SECRET: "b".repeat(48),
});

test("development accepts only configured frontend and fixed local aliases", () => {
  for (const origin of ["http://localhost:5173", "http://127.0.0.1:5173", config.FRONTEND_ORIGIN])
    assert.equal(isAllowedOrigin(origin, config), true);
  for (const origin of [undefined, "null", "http://localhost:5174", "https://evil.invalid", "http://localhost.evil.invalid:5173", "http://192.168.0.1:5173"])
    assert.equal(isAllowedOrigin(origin, config), false);
});

test("production does not allow local development origins", () => {
  const production = { ...config, NODE_ENV: "production" as const };
  assert.equal(isAllowedOrigin(config.FRONTEND_ORIGIN, production), true);
  assert.equal(isAllowedOrigin("http://localhost:5173", production), false);
  assert.equal(isAllowedOrigin("http://127.0.0.1:5173", production), false);
});

test("local origin aliases still require valid CSRF cookie and token", async () => {
  const app = express();
  const protection = csrf(config);
  app.use(cookieParser());
  app.get("/api/csrf", protection.issue);
  app.post("/api/protected", protection.protect, (_req, res) => { res.sendStatus(204); });
  app.use(errorHandler);
  const agent = request.agent(app);
  const response = await agent.get("/api/csrf").expect(200);
  for (const origin of ["http://localhost:5173", "http://127.0.0.1:5173"])
    await agent.post("/api/protected").set("Origin", origin)
      .set("X-CSRF-Token", response.body.data.csrfToken).expect(204);
  await agent.post("/api/protected").set("Origin", "http://localhost:5173").expect(403);
  await agent.post("/api/protected").set("Origin", "https://evil.invalid")
    .set("X-CSRF-Token", response.body.data.csrfToken).expect(403);
});
