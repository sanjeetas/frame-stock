export type StudioSide = "front" | "back";
export interface StudioElement {
  id: string;
  type: "text" | "image" | "rect" | "circle";
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  fill: string;
  opacity: number;
  locked: boolean;
  text?: string;
  fontFamily?: "Arial" | "Georgia" | "Verdana" | "monospace";
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  underline?: boolean;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  productId?: string;
  uploadId?: string;
  flipX?: boolean;
  flipY?: boolean;
  charSpacing?: number;
  crop?: { x: number; y: number; width: number; height: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}
export interface StudioPage {
  background: string;
  elements: StudioElement[];
}
export interface StudioDocument {
  version: 1;
  format: "card" | "product";
  surface?: "magnet";
  twoSided?: boolean;
  productColour?: string;
  shape?: "circle" | "oval" | "rounded";
  printArea?: { x: number; y: number; width: number; height: number };
  specification?: string;
  width: number;
  height: number;
  template: string;
  pages: Record<StudioSide, StudioPage>;
}
export function element(
  type: StudioElement["type"],
  patch: Partial<StudioElement> = {},
): StudioElement {
  return {
    id: crypto.randomUUID(),
    type,
    left: 470,
    top: 290,
    width: 300,
    height: 60,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    fill: "#103759",
    opacity: 1,
    locked: false,
    ...patch,
  };
}
