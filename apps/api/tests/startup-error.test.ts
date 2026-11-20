import test from "node:test";
import assert from "node:assert/strict";
import { parseConfig } from "../src/config/env.js";
import { startupFailure } from "../src/config/startup-error.js";

test("startup config diagnostics identify missing fields without printing values", () => {
  try {
    parseConfig({ MONGODB_URI: "mongodb://private:secret@example.invalid/db" });
    assert.fail("configuration must be rejected");
  } catch (error) {
    const result = startupFailure("configuration", error);
    assert.match(result, /ACCESS_TOKEN_SECRET/);
    assert.match(result, /CSRF_SECRET/);
    assert.doesNotMatch(result, /private|example\.invalid/);
  }
});

test("database diagnostics never disclose driver messages or connection strings", () => {
  for (const stage of ["database", "configuration", "initialisation"]) {
    const result = startupFailure(stage, new Error("mongodb://private:secret@example.invalid/db"));
    assert.doesNotMatch(result, /private|secret@example|example\.invalid/);
  }
  assert.match(startupFailure("database", { code: 18, message: "private password" }), /authentication rejected/);
});
