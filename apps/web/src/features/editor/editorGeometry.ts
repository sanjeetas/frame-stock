import type { DesignSettings } from "../../types/index.ts";
export type DesignLayer = "headline" | "subtitle" | "image";
export interface PercentPoint {
  x: number;
  y: number;
}
export interface LayerBox {
  layer: DesignLayer;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function layerPosition(
  settings: DesignSettings,
  layer: DesignLayer,
): PercentPoint {
  const height = settings.square ? 1200 : 900;
  if (layer === "headline")
    return {
      x: settings.textX ?? 50,
      y: settings.textY ?? (settings.y / height) * 100,
    };
  if (layer === "subtitle")
    return {
      x: settings.subtitleX ?? 50,
      y:
        settings.subtitleY ??
        (Math.min(height - 70, settings.y + settings.size * 2.5) / height) *
          100,
    };
  return {
    x: settings.imageX ?? 50,
    y: settings.imageY ?? (settings.baseProductId ? 43 : 50),
  };
}
export function positionPatch(
  layer: DesignLayer,
  point: PercentPoint,
): Partial<DesignSettings> {
  const clamp = (value: number) =>
    Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
  const x = clamp(point.x),
    y = clamp(point.y);
  return layer === "headline"
    ? { textX: x, textY: y }
    : layer === "subtitle"
      ? { subtitleX: x, subtitleY: y }
      : { imageX: x, imageY: y };
}
export function pointerDelta(
  start: PercentPoint,
  current: PercentPoint,
  rect: { width: number; height: number },
): PercentPoint {
  return {
    x: rect.width > 0 ? ((current.x - start.x) / rect.width) * 100 : 0,
    y: rect.height > 0 ? ((current.y - start.y) / rect.height) * 100 : 0,
  };
}
