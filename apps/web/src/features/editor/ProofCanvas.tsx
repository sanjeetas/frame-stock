import { useEffect, useState } from "react";
import type { DesignSettings, Product } from "../../types";
import { api } from "../../lib/api";
import { apiBase, imageUrl } from "../../lib/utils";

export function ProofCanvas({
  settings,
  onCanvas,
}: {
  settings: DesignSettings;
  onCanvas?: (canvas: HTMLCanvasElement | null) => void;
}) {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [images, setImages] = useState<{
    base?: ImageBitmap;
    art?: ImageBitmap;
    upload?: ImageBitmap;
    key?: string;
  }>({});
  const [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const decoded: ImageBitmap[] = [];
    setLoading(true);
    setError("");
    setImages({});
    async function load(productId?: string, uploadId?: string) {
      if (!productId && !uploadId) return;
      let url: string;
      if (uploadId) {
        await api("/auth/me", { signal: controller.signal });
        url = apiBase + "/design-images/" + uploadId;
      } else {
        const response = await api<Product>("/products/" + productId, {
          signal: controller.signal,
        });
        if (!response.data.image)
          throw Error("Selected product has no preview image.");
        url = imageUrl(response.data.image);
      }
      const response = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
      });
      if (!response.ok) throw Error("Selected image could not be loaded.");
      const bitmap = await createImageBitmap(await response.blob());
      if (controller.signal.aborted) {
        bitmap.close();
        return;
      }
      decoded.push(bitmap);
      return bitmap;
    }
    Promise.all([
      load(settings.baseProductId),
      load(settings.imageProductId),
      load(undefined, settings.imageUploadId),
    ])
      .then(([base, art, upload]) => {
        if (!controller.signal.aborted)
          setImages({
            base,
            art,
            upload,
            key: [
              settings.baseProductId,
              settings.imageProductId,
              settings.imageUploadId,
            ].join("|"),
          });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e.message || "Image could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      decoded.forEach((bitmap) => bitmap.close());
    };
  }, [settings.baseProductId, settings.imageProductId, settings.imageUploadId]);
  useEffect(() => {
    if (
      !canvas ||
      loading ||
      error ||
      images.key !==
        [
          settings.baseProductId,
          settings.imageProductId,
          settings.imageUploadId,
        ].join("|")
    ) {
      onCanvas?.(null);
      return;
    }
    canvas.width = 1200;
    canvas.height = settings.square ? 1200 : 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = settings.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    function draw(
      image: ImageBitmap,
      width: number,
      height: number,
      centerX: number,
      centerY: number,
    ) {
      const scale = Math.min(width / image.width, height / image.height);
      ctx!.drawImage(
        image,
        centerX - (image.width * scale) / 2,
        centerY - (image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
    }
    if (images.base)
      draw(images.base, 1200, canvas.height, 600, canvas.height / 2);
    const overlay = images.upload || images.art;
    if (overlay)
      draw(
        overlay,
        images.base ? 440 : 1120,
        images.base ? 340 : canvas.height - 80,
        600,
        images.base ? canvas.height * 0.43 : canvas.height / 2,
      );
    ctx.fillStyle = settings.fg;
    ctx.textAlign = "center";
    ctx.font = `${settings.size}px ${settings.font}`;
    let text = "",
      line = 0;
    for (const word of settings.headline.split(" ")) {
      if (ctx.measureText(text + word).width > 1050 && text) {
        ctx.fillText(text.trim(), 600, settings.y + line * settings.size * 1.2);
        text = "";
        line++;
      }
      if (line > 2) break;
      text += word + " ";
    }
    if (line <= 2)
      ctx.fillText(text.trim(), 600, settings.y + line * settings.size * 1.2);
    ctx.font = `24px ${settings.font}`;
    ctx.fillText(
      settings.subtitle,
      600,
      Math.min(canvas.height - 70, settings.y + settings.size * 2.5),
      1050,
    );
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.rotate(-0.35);
    ctx.font = "22px Arial";
    for (let y = -400; y < 1800; y += 150)
      for (let x = -600; x < 1800; x += 330)
        ctx.fillText("PHULO PREVIEW", x, y);
    ctx.restore();
    onCanvas?.(canvas);
  }, [canvas, settings, images, loading, error, onCanvas]);
  return (
    <div className="relative">
      <canvas
        ref={setCanvas}
        className="w-full rounded-lg shadow-sm"
        aria-label="Selected product and edited image preview"
      />
      {loading && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center bg-white/90 p-4"
        >
          Loading selected image…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-white/95 p-4 text-red-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
