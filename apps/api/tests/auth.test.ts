import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { SignJWT } from "jose";
import { createApp } from "../src/app.js";
import { parseConfig } from "../src/config/env.js";
import { connectDatabase } from "../src/config/database.js";
import { User } from "../src/models/user.model.js";
import { Session, RefreshToken } from "../src/models/session.model.js";
import { Product } from "../src/models/product.model.js";
const origin = "http://localhost:5173",
  password = "A secure test passphrase 123!";
let repl: MongoMemoryReplSet,
  app: Awaited<ReturnType<typeof createApp>>,
  directory: string;
const config = parseConfig({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1/test",
  FRONTEND_ORIGIN: origin,
  ACCESS_TOKEN_SECRET: "access-secret-test-only-".repeat(3),
  CSRF_SECRET: "csrf-secret-test-only-".repeat(3),
});
type Agent = ReturnType<typeof request.agent>;
let alice: Agent,
  bob: Agent,
  admin: Agent,
  aliceId: string,
  bobId: string,
  adminId: string,
  csrfAlice: string,
  csrfBob: string,
  csrfAdmin: string;
const csrf = async (agent: Agent) =>
  (await agent.get("/api/auth/csrf").expect(200)).body.data.csrfToken as string;
const mutation = (
  agent: Agent,
  method: "post" | "patch" | "delete",
  path: string,
  token: string,
) => agent[method](path).set("Origin", origin).set("X-CSRF-Token", token);
async function register(agent: Agent, name: string, email: string) {
  const token = await csrf(agent);
  const res = await mutation(agent, "post", "/api/auth/register", token)
    .send({ name, email, password })
    .expect(201);
  return { id: res.body.data.user.id, token };
}
async function login(agent: Agent, email: string, token: string) {
  return mutation(agent, "post", "/api/auth/login", token)
    .send({ email, password })
    .expect(200);
}
before(
  async () => {
    process.env.MONGOMS_DOWNLOAD_IGNORE_MISSING_HEADER = "true";
    directory = await mkdtemp(join(tmpdir(), "phulo-mern-"));
    repl = await MongoMemoryReplSet.create({
      binary: {
        version: "8.0.17",
        downloadDir:
          process.env.MONGOMS_DOWNLOAD_DIR || resolve("../../.cache/mongodb"),
      },
      replSet: { count: 1 },
    });
    config.MONGODB_URI = repl.getUri();
    await connectDatabase(config.MONGODB_URI);
    await Promise.all([
      User.init(),
      Session.init(),
      RefreshToken.init(),
      Product.init(),
    ]);
    app = await createApp(config);
    alice = request.agent(app);
    bob = request.agent(app);
    admin = request.agent(app);
    const a = await register(alice, "Alice", "alice@example.test");
    aliceId = a.id;
    csrfAlice = a.token;
    const b = await register(bob, "Bob", "bob@example.test");
    bobId = b.id;
    csrfBob = b.token;
    const c = await register(admin, "Admin", "admin@example.test");
    adminId = c.id;
    csrfAdmin = c.token;
    await User.updateOne({ _id: adminId }, { $set: { role: "admin" } });
    await login(alice, "alice@example.test", csrfAlice);
    await login(bob, "bob@example.test", csrfBob);
    await login(admin, "admin@example.test", csrfAdmin);
  },
  { timeout: 240000 },
);
after(async () => {
  await mongoose.disconnect();
  if (repl) await repl.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});
test("registration only creates user roles; passwords are Argon2id and hidden", async () => {
  const user = await User.findById(aliceId).select("+passwordHash");
  assert.equal(user?.role, "user");
  assert.match(user!.passwordHash, /^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
  assert.equal((await User.findById(aliceId))?.passwordHash, undefined);
  const me = await alice.get("/api/auth/me").expect(200);
  assert.equal(me.body.data.user.id, aliceId);
  assert.deepEqual(Object.keys(me.body.data.user).sort(), [
    "email",
    "id",
    "name",
    "role",
  ]);
  assert.equal(JSON.stringify(me.body).includes("token"), false);
  const evil = request.agent(app),
    token = await csrf(evil);
  await mutation(evil, "post", "/api/auth/register", token)
    .send({
      name: "Attacker",
      email: "bad@example.test",
      password,
      role: "admin",
    })
    .expect(400);
  await mutation(evil, "post", "/api/auth/register", token)
    .send({
      name: "Attacker",
      email: "bad@example.test",
      password,
      userId: aliceId,
    })
    .expect(400);
});
test("missing, forged, expired access tokens return 401", async () => {
  await request(app).get("/api/auth/me").expect(401);
  await request(app).get("/api/orders").expect(401);
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", "phulo_access=invalid")
    .expect(401);
  const expired = await new SignJWT({
    sid: new mongoose.Types.ObjectId().toString(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(aliceId)
    .setIssuer("phulo-api")
    .setAudience("phulo-web")
    .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
    .sign(new TextEncoder().encode(config.ACCESS_TOKEN_SECRET));
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", "phulo_access=" + expired)
    .expect(401);
});
test("CSRF and origin checks reject missing/forged tokens and foreign origins", async () => {
  await alice.post("/api/designs").set("Origin", origin).send({}).expect(403);
  await alice
    .post("/api/designs")
    .set("Origin", origin)
    .set("X-CSRF-Token", "0".repeat(64) + "." + "0".repeat(64))
    .send({})
    .expect(403);
  await mutation(alice, "post", "/api/auth/refresh", csrfAlice)
    .set("Origin", "https://evil.example")
    .send({})
    .expect(403);
  await request(app)
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email: "alice@example.test", password })
    .expect(403);
});
test("wrong role is 403; admin authorization is explicit", async () => {
  await alice.get("/api/admin/products").expect(403);
  await mutation(alice, "post", "/api/admin/products", csrfAlice)
    .send({})
    .expect(403);
  await admin.get("/api/admin/products").expect(200);
  await request(app).get("/api/admin/products").expect(401);
});
const settings = {
  headline: "Hello",
  subtitle: "My design",
  bg: "#eeeeee",
  fg: "#123456",
  font: "Arial",
  size: 62,
  y: 580,
  square: false,
  hasUploadedImage: false,
};
let designId: string;
test("design ownership applies to read/update/delete, including admin", async () => {
  const d = await mutation(alice, "post", "/api/designs", csrfAlice)
    .send({ title: "Alice design", settings })
    .expect(201);
  designId = d.body.data.id;
  await alice.get("/api/designs/" + designId).expect(200);
  await bob.get("/api/designs/" + designId).expect(403);
  await admin.get("/api/designs/" + designId).expect(403);
  await mutation(bob, "patch", "/api/designs/" + designId, csrfBob)
    .send({ title: "Stolen", settings })
    .expect(403);
  await mutation(bob, "delete", "/api/designs/" + designId, csrfBob).expect(
    403,
  );
  await mutation(alice, "patch", "/api/designs/" + designId, csrfAlice)
    .send({ title: "Changed", settings, userId: bobId })
    .expect(400);
  const list = await bob.get("/api/designs").expect(200);
  assert.equal(list.body.meta.total, 0);
});
test("Zod validates IDs, queries, and JSON bodies; duplicate email is a safe 409", async () => {
  await alice.get("/api/designs/not-an-id").expect(400);
  await request(app).get("/api/products?page=-1").expect(400);
  await request(app).get("/api/products?limit=999").expect(400);
  const invalid = await mutation(alice, "post", "/api/designs", csrfAlice)
    .send({ title: "", settings })
    .expect(400);
  assert.equal(invalid.body.error.code, "VALIDATION_ERROR");
  const duplicate = request.agent(app),
    token = await csrf(duplicate);
  const result = await mutation(duplicate, "post", "/api/auth/register", token)
    .send({ name: "Alice", email: "alice@example.test", password })
    .expect(409);
  assert.equal(JSON.stringify(result.body).includes("E11000"), false);
  assert.equal(JSON.stringify(result.body).includes("stack"), false);
});
let orderId: string, productId: string;
test("catalog pagination, server-calculated order price, ownership and private file gating", async () => {
  const p = await mutation(admin, "post", "/api/admin/products", csrfAdmin)
    .send({
      title: "Paid image",
      category: "Nature",
      group: "Image Library",
      price: 450,
      unit: "license",
      editable: true,
      published: true,
    })
    .expect(201);
  productId = p.body.data.id;
  assert.equal(p.body.data.originalFile, undefined);
  const page = await request(app)
    .get("/api/products?limit=1&search=Paid")
    .expect(200);
  assert.equal(page.body.meta.total, 1);
  await mutation(alice, "post", "/api/orders", csrfAlice)
    .send({
      name: "Alice",
      phone: "9876543210",
      owner: bobId,
      items: [{ productId, quantity: 2 }],
    })
    .expect(400);
  const order = await mutation(alice, "post", "/api/orders", csrfAlice)
    .send({
      name: "Alice",
      phone: "9876543210",
      items: [{ productId, quantity: 2, customization: { design: settings } }],
    })
    .expect(201);
  orderId = order.body.data.id;
  assert.equal(order.body.data.total, 900);
  await bob.get("/api/orders/" + orderId).expect(403);
  await mutation(bob, "patch", "/api/orders/" + orderId + "/cancel", csrfBob)
    .send({})
    .expect(403);
  await admin.get("/api/orders/" + orderId).expect(403);
  await alice.get("/api/orders/" + orderId + "/download/0").expect(403);
  await mutation(alice, "patch", "/api/admin/orders/" + orderId, csrfAlice)
    .send({ status: "completed" })
    .expect(403);
  const original = Buffer.from("private HD file");
  await admin
    .post("/api/admin/products/" + productId + "/file?filename=original.zip")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrfAdmin)
    .set("Content-Type", "application/octet-stream")
    .send(original)
    .expect(200);
  await mutation(admin, "patch", "/api/admin/orders/" + orderId, csrfAdmin)
    .send({ status: "completed" })
    .expect(200);
  const download = await alice
    .get("/api/orders/" + orderId + "/download/0")
    .expect(200);
  assert.match(
    download.headers["content-disposition"],
    /^attachment; filename="?original\.zip"?$/,
  );
  await bob.get("/api/orders/" + orderId + "/download/0").expect(403);
  const publicProduct = await request(app)
    .get("/api/products/" + productId)
    .expect(200);
  assert.equal(publicProduct.body.data.originalFile, undefined);
  await request(app).get("/data/originals").expect(404);
});
test("refresh rotates cookie, stores hashes only and rejects replay by revoking session family", async () => {
  const agent = request.agent(app),
    token = await csrf(agent);
  const logged = await login(agent, "alice@example.test", token);
  const originalCookies = logged.headers["set-cookie"] as unknown as string[];
  const originalRefresh = originalCookies
    .find((v) => v.startsWith("phulo_refresh="))!
    .split(";")[0]!;
  const oldRaw = originalRefresh.split("=")[1]!;
  const stored = await RefreshToken.findOne({
    tokenHash: (await import("node:crypto"))
      .createHash("sha256")
      .update(oldRaw)
      .digest("hex"),
  }).select("+tokenHash");
  assert.ok(stored);
  assert.notEqual(stored.tokenHash, oldRaw);
  const rotated = await mutation(agent, "post", "/api/auth/refresh", token)
    .send({})
    .expect(200);
  assert.notEqual(
    (rotated.headers["set-cookie"] as unknown as string[])
      .find((v) => v.startsWith("phulo_refresh="))!
      .split(";")[0],
    originalRefresh,
  );
  assert.deepEqual(rotated.body.data, { refreshed: true });
  await agent.get("/api/auth/me").expect(200);
  await request(app)
    .post("/api/auth/refresh")
    .set("Origin", origin)
    .set("X-CSRF-Token", token)
    .set("Cookie", [originalRefresh, "phulo_csrf=" + token.split(".")[0]])
    .send({})
    .expect(401);
  await agent.get("/api/auth/me").expect(401);
  await mutation(agent, "post", "/api/auth/refresh", token)
    .send({})
    .expect(401);
});
test("register → login → protected API → refresh → logout revokes refresh and access", async () => {
  const agent = request.agent(app),
    r = await register(agent, "Flow User", "flow@example.test");
  const logged = await login(agent, "flow@example.test", r.token);
  const accessCookie = (logged.headers["set-cookie"] as unknown as string[])
    .find((v) => v.startsWith("phulo_access="))!
    .split(";")[0]!;
  await agent.get("/api/auth/me").expect(200);
  await mutation(agent, "post", "/api/auth/refresh", r.token)
    .send({})
    .expect(200);
  await mutation(agent, "post", "/api/auth/logout", r.token)
    .send({})
    .expect(200);
  await agent.get("/api/auth/me").expect(401);
  await request(app)
    .get("/api/auth/me")
    .set("Cookie", accessCookie)
    .expect(401);
  await mutation(agent, "post", "/api/auth/refresh", r.token)
    .send({})
    .expect(401);
});
test("production cookies are HttpOnly, Secure, SameSite and refresh is path-scoped", async () => {
  const production = await createApp({ ...config, NODE_ENV: "production" }),
    agent = request.agent(production);
  const token = await csrf(agent);
  const r = await request(production)
    .post("/api/auth/login")
    .set("Origin", origin)
    .set("Cookie", "phulo_csrf=" + token.split(".")[0])
    .set("X-CSRF-Token", token)
    .send({ email: "alice@example.test", password })
    .expect(200);
  for (const c of r.headers["set-cookie"] as unknown as string[]) {
    assert.match(c, /HttpOnly/);
    assert.match(c, /Secure/);
    assert.match(c, /SameSite=Lax/);
  }
  assert.match(
    (r.headers["set-cookie"] as unknown as string[]).find((c) =>
      c.startsWith("phulo_refresh="),
    )!,
    /Path=\/api\/auth/,
  );
  assert.equal(JSON.stringify(r.body).includes("passwordHash"), false);
});
test("login rate limit returns consistent 429; wrong passwords use generic 401", async () => {
  const isolated = await createApp(config),
    agent = request.agent(isolated),
    token = await csrf(agent);
  for (let i = 0; i < 20; i++) {
    const r = await mutation(agent, "post", "/api/auth/login", token)
      .send({ email: "absent@example.test", password: "wrong" })
      .expect(401);
    assert.equal(r.body.error.message, "Email or password is incorrect.");
  }
  const limited = await mutation(agent, "post", "/api/auth/login", token)
    .send({ email: "absent@example.test", password: "wrong" })
    .expect(429);
  assert.equal(limited.body.success, false);
  assert.equal(limited.body.error.code, "RATE_LIMITED");
});

test("expired refresh session and server-side role changes take effect immediately", async () => {
  const agent = request.agent(app),
    token = await csrf(agent);
  const logged = await login(agent, "bob@example.test", token);
  const raw = (logged.headers["set-cookie"] as unknown as string[])
    .find((v) => v.startsWith("phulo_refresh="))!
    .split(";")[0]!
    .split("=")[1]!;
  const digest = (await import("node:crypto"))
    .createHash("sha256")
    .update(raw)
    .digest("hex");
  const refresh = await RefreshToken.findOne({ tokenHash: digest });
  assert.ok(refresh);
  await Session.updateOne(
    { _id: refresh.session },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );
  await agent.get("/api/auth/me").expect(401);
  await mutation(agent, "post", "/api/auth/refresh", token)
    .send({})
    .expect(401);
  await User.updateOne({ _id: adminId }, { $set: { role: "user" } });
  await admin.get("/api/admin/products").expect(403);
  await User.updateOne({ _id: adminId }, { $set: { role: "admin" } });
});
test("concurrent refresh reuse fails closed and revokes the family", async () => {
  const agent = request.agent(app),
    token = await csrf(agent);
  const logged = await login(agent, "bob@example.test", token);
  const old = (logged.headers["set-cookie"] as unknown as string[])
    .find((v) => v.startsWith("phulo_refresh="))!
    .split(";")[0]!;
  const send = () =>
    request(app)
      .post("/api/auth/refresh")
      .set("Origin", origin)
      .set("X-CSRF-Token", token)
      .set("Cookie", [old, "phulo_csrf=" + token.split(".")[0]])
      .send({});
  const results = await Promise.all([send(), send()]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
  const winner = results.find((r) => r.status === 200)!;
  const access = (winner.headers["set-cookie"] as unknown as string[])
    .find((v) => v.startsWith("phulo_access="))!
    .split(";")[0]!;
  await request(app).get("/api/auth/me").set("Cookie", access).expect(401);
});
test("search input is literal; unknown user identifiers and oversized JSON are rejected", async () => {
  const r = await request(app)
    .get("/api/products?search=" + encodeURIComponent(".*"))
    .expect(200);
  assert.equal(r.body.meta.total, 0);
  await mutation(alice, "post", "/api/designs", csrfAlice)
    .send({ title: "Spoof", settings, owner: bobId })
    .expect(400);
  const large = await mutation(alice, "post", "/api/designs", csrfAlice)
    .send({ title: "x".repeat(70000), settings })
    .expect(413);
  assert.equal(large.body.error.code, "PAYLOAD_TOO_LARGE");
  await request(app).get("/api/admin/login").expect(401);
});
test("catalog seed uses MongoDB and is idempotent", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const env = {
    ...process.env,
    NODE_ENV: "test",
    MONGODB_URI: config.MONGODB_URI,
    FRONTEND_ORIGIN: origin,
    ACCESS_TOKEN_SECRET: config.ACCESS_TOKEN_SECRET,
    CSRF_SECRET: config.CSRF_SECRET,
  };
  await run(process.execPath, ["--import", "tsx", "src/scripts/seed.ts"], {
    env,
  });
  const count = await Product.countDocuments();
  await run(process.execPath, ["--import", "tsx", "src/scripts/seed.ts"], {
    env,
  });
  assert.equal(await Product.countDocuments(), count);
  assert.ok(count >= 110);
  assert.equal((await Product.findOne({ title: "Printed Mugs" }))?.price, 450);
});

test("GridFS keeps originals over 16 MB across app restarts and reclaims replaced/deleted files", async () => {
  const { bucket } = await import("../src/services/blob.service.js");
  await admin.get("/api/admin/storage").expect(200);
  const content = Buffer.alloc(17 * 1024 * 1024, 41);
  await admin
    .post("/api/admin/products/" + productId + "/file?filename=large.zip")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrfAdmin)
    .set("Content-Type", "application/octet-stream")
    .send(content)
    .expect(200);
  assert.equal(
    await mongoose.connection
      .db!.collection("phulo_originals.files")
      .countDocuments(),
    1,
  );
  const logged = await login(alice, "alice@example.test", csrfAlice);
  const cookie = (logged.headers["set-cookie"] as unknown as string[])
    .find((v) => v.startsWith("phulo_access="))!
    .split(";")[0]!;
  const restarted = await createApp(config);
  const response = await request(restarted)
    .get("/api/orders/" + orderId + "/download/0")
    .set("Cookie", cookie)
    .expect(200);
  assert.equal(Buffer.isBuffer(response.body), true);
  assert.equal(response.body.length, content.length);
  assert.deepEqual(response.body, content);
  const after = await admin.get("/api/admin/storage").expect(200);
  assert.equal(after.body.data.usedBytes, content.length);
  await mutation(
    alice,
    "delete",
    "/api/admin/products/" + productId + "/file",
    csrfAlice,
  ).expect(403);
  await mutation(
    admin,
    "delete",
    "/api/admin/products/" + productId + "/file",
    csrfAdmin,
  ).expect(200);
  assert.equal(
    await mongoose.connection
      .db!.collection("phulo_originals.files")
      .countDocuments(),
    0,
  );
  assert.equal(
    (await admin.get("/api/admin/storage").expect(200)).body.data.usedBytes,
    0,
  );
  await alice.get("/api/orders/" + orderId + "/download/0").expect(404);
});
test("public previews are resized PNGs and cannot expose original files", async () => {
  const sharp = (await import("sharp")).default;
  const image = await sharp({
    create: { width: 1000, height: 1000, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  const response = await admin
    .post("/api/admin/products/" + productId + "/preview")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrfAdmin)
    .set("Content-Type", "application/octet-stream")
    .send(image)
    .expect(200);
  const preview = await request(app).get(response.body.data.image).expect(200);
  assert.match(preview.headers["content-type"], /^image\/png/);
  const metadata = await sharp(preview.body).metadata();
  assert.equal(metadata.width, 800);
  assert.equal(metadata.height, 800);
  const pixels = await sharp(preview.body).removeAlpha().raw().toBuffer();
  assert.ok(
    pixels.some((channel) => channel < 240),
    "Server-generated watermark must alter a plain white preview.",
  );
  await request(app).get("/api/previews/../../phulo_originals").expect(404);
  const bad = await admin
    .post("/api/admin/products/" + productId + "/preview")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrfAdmin)
    .set("Content-Type", "application/octet-stream")
    .send(Buffer.from('<svg onload="alert(1)"/>'))
    .expect(400);
  assert.equal(bad.body.error.code, "INVALID_IMAGE");
});
test("upload quota fails closed without publishing a dangling file", async () => {
  const limited = await createApp({ ...config, UPLOAD_STORAGE_LIMIT_MB: 1 });
  const logged = await login(admin, "admin@example.test", csrfAdmin);
  const access = (logged.headers["set-cookie"] as unknown as string[])
    .find((v) => v.startsWith("phulo_access="))!
    .split(";")[0]!;
  const response = await request(limited)
    .post("/api/admin/products/" + productId + "/file?filename=large.zip")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrfAdmin)
    .set("Cookie", [access, "phulo_csrf=" + csrfAdmin.split(".")[0]])
    .set("Content-Type", "application/octet-stream")
    .send(Buffer.alloc(2 * 1024 * 1024))
    .expect(413);
  assert.equal(response.body.error.code, "STORAGE_LIMIT");
  assert.equal(
    (
      await request(app)
        .get("/api/products/" + productId)
        .expect(200)
    ).body.data.hasFile,
    false,
  );
});
test("bootstrap seeds and creates an admin once without overwriting passwords or promoting customers", async () => {
  const { bootstrapApplication } =
    await import("../src/services/bootstrap.service.js");
  const env = {
    AUTO_SEED: "true",
    BOOTSTRAP_ADMIN: "true",
    ADMIN_NAME: "Bootstrap Admin",
    ADMIN_EMAIL: "bootstrap@example.test",
    ADMIN_PASSWORD: "A bootstrap-only test passphrase",
  };
  await bootstrapApplication(env);
  const before = await User.findOne({ email: env.ADMIN_EMAIL }).select(
    "+passwordHash",
  );
  assert.equal(before?.role, "admin");
  await bootstrapApplication({
    ...env,
    ADMIN_PASSWORD: "A different secure test passphrase",
  });
  const after = await User.findOne({ email: env.ADMIN_EMAIL }).select(
    "+passwordHash",
  );
  assert.equal(after?.passwordHash, before?.passwordHash);
  await assert.rejects(() =>
    bootstrapApplication({ ...env, ADMIN_EMAIL: "alice@example.test" }),
  );
  assert.equal((await User.findById(aliceId))?.role, "user");
  const derived = parseConfig({
    ...config,
    NODE_ENV: "production",
    FRONTEND_ORIGIN: "",
    RENDER_EXTERNAL_URL: "https://phulo-test.onrender.com",
  });
  assert.equal(derived.FRONTEND_ORIGIN, "https://phulo-test.onrender.com");
});
