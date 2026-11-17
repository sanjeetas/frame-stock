import {
  useEffect,
  useState,
  useRef,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import {
  layerPosition,
  positionPatch,
  pointerDelta,
  type DesignLayer,
  type LayerBox,
  type PercentPoint,
} from "./editorGeometry";
import type { DesignSettings, Product } from "../../types";
import { api } from "../../lib/api";
import { apiBase, imageUrl } from "../../lib/utils";

export function ProofCanvas({
  settings,
  onCanvas,
  selectedLayer,
  onSelectLayer,
  onChange,
  onEditText,
}: {
  settings: DesignSettings;
  onCanvas?: (canvas: HTMLCanvasElement | null) => void;
  selectedLayer?: DesignLayer;
  onSelectLayer?: (layer: DesignLayer) => void;
  onChange?: (patch: Partial<DesignSettings>) => void;
  onEditText?: (layer: DesignLayer) => void;
}) {
  const [boxes, setBoxes] = useState<LayerBox[]>([]);
  const drag = useRef<{
    pointerId: number;
    layer: DesignLayer;
    start: PercentPoint;
    position: PercentPoint;
  } | null>(null);
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
    const nextBoxes: LayerBox[] = [];
    const overlay = images.upload || images.art;
    if (overlay) {
      const position = layerPosition(settings, "image");
      const scale =
        (Math.min(
          (images.base ? 440 : 1120) / overlay.width,
          (images.base ? 340 : canvas.height - 80) / overlay.height,
        ) *
          (settings.imageScale ?? 100)) /
        100;
      const width = overlay.width * scale,
        height = overlay.height * scale;
      const x = (position.x / 100) * canvas.width - width / 2,
        y = (position.y / 100) * canvas.height - height / 2;
      ctx.drawImage(overlay, x, y, width, height);
      nextBoxes.push({ layer: "image", x, y, width, height });
    }
    ctx.fillStyle = settings.fg;
    ctx.textAlign = "center";
    function textLayer(
      layer: "headline" | "subtitle",
      content: string,
      size: number,
    ) {
      if (!content.trim()) return;
      ctx!.font = `${size}px ${settings.font}`;
      const lines: string[] = [];
      let row = "";
      for (const word of content.split(" ")) {
        if (ctx!.measureText(row + word).width > 1050 && row) {
          lines.push(row.trim());
          row = "";
        }
        row += word + " ";
      }
      if (row.trim()) lines.push(row.trim());
      const position = layerPosition(settings, layer),
        x = (position.x / 100) * canvas!.width,
        y = (position.y / 100) * canvas!.height;
      lines.forEach((line, index) =>
        ctx!.fillText(line, x, y + index * size * 1.2, 1050),
      );
      const width = Math.min(
        1050,
        Math.max(...lines.map((line) => ctx!.measureText(line).width)),
      );
      nextBoxes.push({
        layer,
        x: x - width / 2 - 8,
        y: y - size - 8,
        width: Math.max(44, width + 16),
        height: size * 1.2 * lines.length + 16,
      });
    }
    textLayer("headline", settings.headline, settings.size);
    textLayer("subtitle", settings.subtitle, settings.subtitleSize ?? 24);
    setBoxes(nextBoxes);
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
  function startDrag(
    event: PointerEvent<HTMLButtonElement>,
    layer: DesignLayer,
  ) {
    if (!onChange || loading || error || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    onSelectLayer?.(layer);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      layer,
      start: { x: event.clientX, y: event.clientY },
      position: layerPosition(settings, layer),
    };
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || event.pointerId !== active.pointerId || !canvas) return;
    const delta = pointerDelta(
      active.start,
      { x: event.clientX, y: event.clientY },
      canvas.getBoundingClientRect(),
    );
    onChange?.(
      positionPatch(active.layer, {
        x: active.position.x + delta.x,
        y: active.position.y + delta.y,
      }),
    );
  }
  function keyboardMove(
    event: KeyboardEvent<HTMLButtonElement>,
    layer: DesignLayer,
  ) {
    if (event.key === "Enter" || event.key === "F2") {
      event.preventDefault();
      onEditText?.(layer);
      return;
    }
    const direction = (
      {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      } as Record<string, number[]>
    )[event.key];
    if (!direction || !canvas) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const position = layerPosition(settings, layer);
    onChange?.(
      positionPatch(layer, {
        x: position.x + ((direction[0] * step) / canvas.width) * 100,
        y: position.y + ((direction[1] * step) / canvas.height) * 100,
      }),
    );
  }
  return (
    <div className="relative overflow-hidden rounded-lg">
      <canvas
        ref={setCanvas}
        className="block w-full rounded-lg shadow-sm"
        aria-label="Selected product and edited image preview"
      />
      {onChange &&
        !loading &&
        !error &&
        canvas &&
        boxes.map((box) => (
          <button
            key={box.layer}
            type="button"
            className={
              "absolute touch-none rounded-sm border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 " +
              (selectedLayer === box.layer
                ? "border-cyan-600 bg-cyan-400/5"
                : "border-transparent hover:border-cyan-500/70")
            }
            style={{
              left: `${(box.x / canvas.width) * 100}%`,
              top: `${(box.y / canvas.height) * 100}%`,
              width: `${(box.width / canvas.width) * 100}%`,
              height: `${(box.height / canvas.height) * 100}%`,
              cursor: "move",
            }}
            aria-label={`Select and move ${box.layer === "image" ? "image" : box.layer === "headline" ? "headline text" : "supporting text"}. Arrow keys move; Shift moves faster.`}
            aria-pressed={selectedLayer === box.layer}
            onClick={() => onSelectLayer?.(box.layer)}
            onDoubleClick={() => onEditText?.(box.layer)}
            onPointerDown={(event) => startDrag(event, box.layer)}
            onPointerMove={moveDrag}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId))
                event.currentTarget.releasePointerCapture(event.pointerId);
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onLostPointerCapture={() => {
              drag.current = null;
            }}
            onKeyDown={(event) => keyboardMove(event, box.layer)}
          >
            <span className="sr-only">{box.layer}</span>
            {selectedLayer === box.layer && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -left-1 size-2 rounded-full border border-white bg-cyan-700"
              />
            )}
          </button>
        ))}
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
