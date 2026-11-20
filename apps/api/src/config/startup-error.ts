import { ZodError } from "zod";

// Only fixed guidance and validated field names may reach startup logs.
// MongoDB errors can contain connection strings, so never print their messages.
export function startupFailure(stage: string, error: unknown): string {
  if (stage === "configuration") {
    if (error instanceof ZodError) {
      const fields = [...new Set(error.issues.map((issue) => issue.path[0]))]
        .filter((field): field is string =>
          typeof field === "string" && /^[A-Z][A-Z0-9_]*$/.test(field));
      return `Startup failed: invalid or missing .env fields: ${fields.join(", ")}. Secrets must be at least 32 characters. Values are not logged.`;
    }
    return "Startup failed: check FRONTEND_ORIGIN (http://localhost:5173 for development), COOKIE_SAME_SITE (lax locally), and use two different signing secrets.";
  }
  if (stage === "database") {
    const code = error && typeof error === "object" && "code" in error
      ? error.code : undefined;
    if (code === 18)
      return "Startup failed: MongoDB authentication rejected. Check the database user's username/password and URL-encode password characters in MONGODB_URI. Use the database password, not your Atlas login.";
    return "Startup failed: MongoDB connection failed. Check MONGODB_URI, resume the Atlas cluster, and allow this computer's current IP in the same Atlas project. If using 127.0.0.1, start the local MongoDB replica set first.";
  }
  return "Startup failed during database initialisation. Check database-user permissions and bootstrap settings. Credentials and database error details are not logged.";
}
