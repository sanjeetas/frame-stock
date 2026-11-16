import { z } from "zod";
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().min(1),
  FRONTEND_ORIGIN: z.url().default("http://localhost:5173"),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(900)
    .default(600),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(3).default(0),
  UPLOAD_STORAGE_LIMIT_MB: z.coerce.number().int().min(1).max(400).default(400),
});
export type Config = z.infer<typeof schema>;
export function parseConfig(
  input: NodeJS.ProcessEnv | Record<string, unknown>,
): Config {
  const env = schema.parse({
    ...input,
    FRONTEND_ORIGIN:
      input.FRONTEND_ORIGIN ||
      input.RENDER_EXTERNAL_URL ||
      "http://localhost:5173",
  });
  const frontend = new URL(env.FRONTEND_ORIGIN);
  if (!["http:", "https:"].includes(frontend.protocol))
    throw new Error("Frontend origin must use HTTP or HTTPS");
  if (env.NODE_ENV === "production" && frontend.protocol !== "https:")
    throw new Error("Production frontend must use HTTPS");
  env.FRONTEND_ORIGIN = frontend.origin;
  if (env.COOKIE_SAME_SITE === "none" && env.NODE_ENV !== "production")
    throw new Error("SameSite=None requires production HTTPS cookies");
  if (env.ACCESS_TOKEN_SECRET === env.CSRF_SECRET)
    throw new Error("Use separate access-token and CSRF secrets");
  return env;
}
