import { useEffect, useState } from "react";
import type { DesignSettings } from "../../types";
export function StudioPreview({
  settings,
  side = "front",
}: {
  settings: DesignSettings;
  side?: "front" | "back";
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    setError("");
    (async () => {
      const { studioPreview } = await import("./studioCanvas");
      const url = await studioPreview(
        settings.studio!,
        side,
        settings.baseProductId,
      );
      if (active) setUrl(url);
    })().catch((error) => {
      if (active) setError(error.message || "Design preview unavailable.");
    });
    return () => {
      active = false;
    };
  }, [settings.studio, settings.baseProductId, side]);
  return error ? (
    <p role="alert" className="p-6 text-red-700">
      {error}
    </p>
  ) : url ? (
    <img
      src={url}
      className="block w-full rounded-lg"
      alt={`Saved ${side} artwork preview`}
    />
  ) : (
    <p role="status" className="p-6 text-slate-500">
      Loading design preview…
    </p>
  );
}
