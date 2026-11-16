import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import type { ApiResponse } from "../types";
export function useApiQuery<T>(path: string | null) {
  const [data, setData] = useState<ApiResponse<T> | null>(null),
    [loading, setLoading] = useState(!!path),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<T>(path, { signal: controller.signal })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, revision]);
  return { data, loading, error, reload };
}
