import { apiBase } from "./utils";
import type { ApiResponse } from "../types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
let csrfToken: string | undefined,
  csrfRequest: Promise<string> | undefined,
  refreshRequest: Promise<void> | undefined;
async function read<T>(res: Response): Promise<ApiResponse<T>> {
  let result;
  try {
    result = await res.json();
  } catch {
    throw new ApiError(
      "API unavailable. Configure and deploy the Express + MongoDB backend.",
      res.status,
      "API_UNAVAILABLE",
    );
  }
  if (!res.ok || !result.success)
    throw new ApiError(
      result.error?.message || "Request failed.",
      res.status,
      result.error?.code || "REQUEST_FAILED",
    );
  return result;
}
async function csrf(force = false) {
  if (force) csrfToken = undefined;
  if (csrfToken) return csrfToken;
  csrfRequest ??= fetch(apiBase + "/auth/csrf", { credentials: "include" })
    .then(read<{ csrfToken: string }>)
    .then((r) => (csrfToken = r.data.csrfToken))
    .finally(() => {
      csrfRequest = undefined;
    });
  return csrfRequest;
}
async function refresh() {
  refreshRequest ??= (async () => {
    const perform = async () => {
      const token = await csrf(true);
      await read(
        await fetch(apiBase + "/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": token,
          },
          body: "{}",
        }),
      );
    };
    if (navigator.locks)
      await navigator.locks.request("phulo-refresh-session", perform);
    else await perform();
  })().finally(() => {
    refreshRequest = undefined;
  });
  return refreshRequest;
}
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    raw?: File;
  } = {},
  retry = true,
): Promise<ApiResponse<T>> {
  const method = options.method || "GET",
    mutation = !["GET", "HEAD"].includes(method);
  try {
    const headers: Record<string, string> = {};
    if (mutation) headers["X-CSRF-Token"] = await csrf();
    if (options.raw) headers["Content-Type"] = "application/octet-stream";
    else if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    const res = await fetch(apiBase + path, {
      method,
      credentials: "include",
      headers,
      body:
        options.raw ??
        (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: options.signal,
    });
    return await read<T>(res);
  } catch (e) {
    if (
      e instanceof ApiError &&
      e.status === 403 &&
      e.code === "CSRF_FAILED" &&
      retry
    ) {
      await csrf(true);
      return api(path, options, false);
    }
    if (
      e instanceof ApiError &&
      e.status === 401 &&
      retry &&
      (!path.startsWith("/auth/") || path === "/auth/me")
    ) {
      try {
        await refresh();
      } catch (refreshError) {
        if (refreshError instanceof ApiError && refreshError.status === 401)
          window.dispatchEvent(new Event("phulo:session-expired"));
        throw refreshError;
      }
      return api(path, options, false);
    }
    if (
      e instanceof ApiError &&
      e.status === 401 &&
      (!path.startsWith("/auth/") || path === "/auth/me")
    )
      window.dispatchEvent(new Event("phulo:session-expired"));
    if (e instanceof TypeError)
      throw new ApiError(
        "Backend connection failed. Check the API address and server.",
        0,
        "NETWORK_ERROR",
      );
    throw e;
  }
}
export const resetCsrf = () => {
  csrfToken = undefined;
};
