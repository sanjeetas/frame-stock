import type { StudioDocument } from "./studioTypes";

export type CustomMagnetCut = "heart" | "starburst";
export function magnetCutPoints(shape: StudioDocument["shape"], width: number, height: number) {
  if (shape !== "heart" && shape !== "starburst") return undefined;
  const raw = Array.from({ length: shape === "heart" ? 64 : 24 }, (_, index) => {
    const angle = (index / (shape === "heart" ? 64 : 24)) * Math.PI * 2;
    if (shape === "heart") return { x: 16 * Math.sin(angle) ** 3, y: -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) };
    const radius = index % 2 ? 0.78 : 1;
    return { x: Math.cos(angle - Math.PI / 2) * radius, y: Math.sin(angle - Math.PI / 2) * radius };
  });
  const minX = Math.min(...raw.map((p) => p.x)), maxX = Math.max(...raw.map((p) => p.x));
  const minY = Math.min(...raw.map((p) => p.y)), maxY = Math.max(...raw.map((p) => p.y));
  return raw.map((p) => ({ x: (p.x - minX) / (maxX - minX) * width, y: (p.y - minY) / (maxY - minY) * height }));
}
