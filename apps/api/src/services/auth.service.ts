import mongoose from "mongoose";
import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { User, userDto } from "../models/user.model.js";
import { Session, RefreshToken } from "../models/session.model.js";
import { AppError } from "../lib.js";
import type { Config } from "../config/env.js";
export const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const opaque = () => randomBytes(48).toString("base64url");
export async function createAuthService(config: Config) {
  const key = new TextEncoder().encode(config.ACCESS_TOKEN_SECRET);
  const dummyHash = await hashPassword(randomBytes(32).toString("hex"));
  async function accessToken(userId: string, sessionId: string) {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(userId)
      .setIssuer("phulo-api")
      .setAudience("phulo-web")
      .setIssuedAt()
      .setExpirationTime(`${config.ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(key);
  }
  return {
    async register(body: { name: string; email: string; password: string }) {
      const u = await User.create({
        name: body.name,
        email: body.email,
        passwordHash: await hashPassword(body.password),
        role: "user",
      });
      return userDto(u);
    },
    async login(body: { email: string; password: string }) {
      const user = await User.findOne({ email: body.email }).select(
        "+passwordHash",
      );
      const valid = await argon2.verify(
        user?.passwordHash ?? dummyHash,
        body.password,
      );
      if (!user || !valid || !user.active)
        throw new AppError(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      const refresh = opaque(),
        expiresAt = new Date(
          Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000,
        );
      let sessionId = "";
      await mongoose.connection.transaction(async (transaction) => {
        const family = new Session({ user: user._id, expiresAt });
        await family.save({ session: transaction });
        sessionId = String(family._id);
        await RefreshToken.create(
          [{ session: family._id, tokenHash: hash(refresh), expiresAt }],
          { session: transaction },
        );
      });
      return {
        user: userDto(user),
        access: await accessToken(String(user._id), sessionId),
        refresh,
        expiresAt,
      };
    },
    async refresh(raw: unknown) {
      if (typeof raw !== "string" || !/^[\w-]{64}$/.test(raw))
        throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
      const next = opaque();
      let result:
          { userId: string; sessionId: string; expiresAt: Date } | undefined,
        replayed = false;
      await mongoose.connection.transaction(async (transaction) => {
        result = undefined;
        replayed = false;
        const token = await RefreshToken.findOne({
          tokenHash: hash(raw),
        }).session(transaction);
        if (!token || token.expiresAt.getTime() <= Date.now())
          throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
        const family = await Session.findOne({
          _id: token.session,
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        }).session(transaction);
        if (!family)
          throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
        if (token.usedAt) {
          family.revokedAt = new Date();
          family.revokedReason = "refresh-reuse";
          await family.save({ session: transaction });
          replayed = true;
          return;
        }
        const user = await User.findOne({
          _id: family.user,
          active: true,
        }).session(transaction);
        if (!user)
          throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
        const consumed = await RefreshToken.updateOne(
          { _id: token._id, usedAt: null },
          { $set: { usedAt: new Date() } },
          { session: transaction },
        );
        if (consumed.modifiedCount !== 1)
          throw new AppError(401, "UNAUTHENTICATED", "Please sign in again.");
        await RefreshToken.create(
          [
            {
              session: family._id,
              tokenHash: hash(next),
              expiresAt: family.expiresAt,
            },
          ],
          { session: transaction },
        );
        result = {
          userId: String(user._id),
          sessionId: String(family._id),
          expiresAt: family.expiresAt,
        };
      });
      if (replayed || !result)
        throw new AppError(
          401,
          "SESSION_REVOKED",
          "Session expired. Please sign in again.",
        );
      return {
        access: await accessToken(result.userId, result.sessionId),
        refresh: next,
        expiresAt: result.expiresAt,
      };
    },
    async logout(raw: unknown, access?: unknown) {
      if (typeof raw === "string") {
        const token = await RefreshToken.findOne({ tokenHash: hash(raw) });
        if (token)
          await Session.updateOne(
            { _id: token.session, revokedAt: null },
            { $set: { revokedAt: new Date(), revokedReason: "logout" } },
          );
      }
      let sessionId: string | undefined;
      if (typeof access === "string") {
        try {
          const { payload } = await jwtVerify(access, key, {
            algorithms: ["HS256"],
            issuer: "phulo-api",
            audience: "phulo-web",
          });
          if (
            typeof payload.sid === "string" &&
            mongoose.isObjectIdOrHexString(payload.sid)
          )
            sessionId = payload.sid;
        } catch {}
      }
      if (sessionId)
        await Session.updateOne(
          { _id: sessionId, revokedAt: null },
          { $set: { revokedAt: new Date(), revokedReason: "logout" } },
        );
    },
    async verify(raw: unknown) {
      if (typeof raw !== "string")
        throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
      let payload;
      try {
        ({ payload } = await jwtVerify(raw, key, {
          algorithms: ["HS256"],
          issuer: "phulo-api",
          audience: "phulo-web",
          requiredClaims: ["sub", "sid", "exp", "iat"],
        }));
      } catch {
        throw new AppError(
          401,
          "UNAUTHENTICATED",
          "Session expired. Please sign in again.",
        );
      }
      if (
        typeof payload.sub !== "string" ||
        !mongoose.isObjectIdOrHexString(payload.sub) ||
        typeof payload.sid !== "string" ||
        !mongoose.isObjectIdOrHexString(payload.sid)
      )
        throw new AppError(401, "UNAUTHENTICATED", "Invalid session.");
      const family = await Session.findOne({
        _id: payload.sid,
        user: payload.sub,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });
      const user = family
        ? await User.findOne({ _id: payload.sub, active: true })
        : null;
      if (!user)
        throw new AppError(
          401,
          "UNAUTHENTICATED",
          "Session is no longer active.",
        );
      return {
        identity: {
          userId: String(user._id),
          role: user.role as "user" | "admin",
          sessionId: payload.sid,
        },
        user: userDto(user),
      };
    },
  };
}
export type AuthService = Awaited<ReturnType<typeof createAuthService>>;
