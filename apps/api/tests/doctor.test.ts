import { resolve } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const run = promisify(execFile);
const cwd = fileURLToPath(new URL("..", import.meta.url));
function inspect(uri: string) {
  return run(process.execPath, ["--import", "tsx", "src/scripts/doctor.ts"], {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: "test",
      MONGODB_URI: uri,
      FRONTEND_ORIGIN: "http://localhost:5173",
      ACCESS_TOKEN_SECRET: "a".repeat(48),
      CSRF_SECRET: "b".repeat(48),
      COOKIE_SAME_SITE: "lax",
    },
  });
}

test("doctor reads the real product query without creating collections or indexes", async () => {
  process.env.MONGOMS_DOWNLOAD_IGNORE_MISSING_HEADER = "true";
  const repl = await MongoMemoryReplSet.create({
    binary: { version: "8.0.17", downloadDir: process.env.MONGOMS_DOWNLOAD_DIR || resolve(cwd, "../../.cache/mongodb") },
    replSet: { count: 1 },
  });
  try {
    const uri = repl.getUri("doctor_read_only");
    await mongoose.connect(uri);
    const result = await inspect(uri);
    assert.match(result.stdout, /actual product-list query and response conversion succeeded/);
    assert.match(result.stdout, /No published products/);
    const collections = await mongoose.connection.db!.listCollections({}, { nameOnly: true }).toArray();
    assert.deepEqual(collections, []);
  } finally {
    await mongoose.disconnect();
    await repl.stop();
  }
});

test("doctor failure reports do not expose URI credentials or signing secrets", async () => {
  const uri = "mongodb://private-doctor-user:sensitive-password-should-not-print@";
  await assert.rejects(inspect(uri), (error: unknown) => {
    assert.ok(error instanceof Error && "stdout" in error && "stderr" in error);
    const output = String(error.stdout) + String(error.stderr);
    assert.match(output, /Startup failed/);
    assert.doesNotMatch(output, /private-doctor-user|sensitive-password-should-not-print/);
    assert.equal(output.includes("a".repeat(48)), false);
    assert.equal(output.includes("b".repeat(48)), false);
    return true;
  });
});
