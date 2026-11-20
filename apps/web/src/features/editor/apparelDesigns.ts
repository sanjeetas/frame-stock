import {
  element,
  type StudioDocument,
  type StudioElement,
} from "./studioTypes.ts";

export const readyDesigns = [
  { id: "make-it", name: "Make It Happen" },
  { id: "outdoor-club", name: "Adventure Club" },
  { id: "studio-mark", name: "Studio Monogram" },
  { id: "stay-curious", name: "Stay Curious" },
  { id: "photo-message", name: "Photo Print" },
  { id: "upload-design", name: "Upload Your Artwork" },
];
export function designInk(hex = "#ffffff") {
  const brightness =
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16))
      .reduce((sum, c) => sum + c, 0) / 3;
  return brightness < 125 ? "#fff6e6" : "#12364b";
}
export function readyProductDesign(
  doc: StudioDocument,
  id: string,
  family: string,
): StudioDocument["pages"]["front"] {
  const area = doc.printArea || { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    w = area.width * doc.width,
    h = area.height * doc.height;
  const x = (area.x + area.width / 2) * doc.width,
    y = area.y * doc.height;
  const ink = designInk(doc.productColour),
    accent = "#e9894e";
  const elements: StudioElement[] = [];
  const text = (
    key: string,
    value: string,
    top: number,
    size: number,
    fill = ink,
    font: "Arial" | "Georgia" = "Arial",
  ) =>
    element("text", {
      id: key,
      left: x,
      top: y + h * top,
      width: w * 0.94,
      height: Math.max(24, size * 1.3),
      text: value,
      fontSize: Math.min(190, Math.max(10, size)),
      fontFamily: font,
      fontWeight: "bold",
      textAlign: "center",
      lineHeight: 1,
      fill,
    });
  if (id === "make-it") {
    const words =
      family === "Mugs & Drinkware"
        ? "GOOD\nMORNING"
        : family === "Bags"
          ? "TAKE THE\nSCENIC ROUTE"
          : "MAKE IT\nHAPPEN";
    elements.push(
      text("product-headline", words, 0.45, Math.min(w * 0.18, h * 0.28)),
      text(
        "product-subtitle",
        family === "Mugs & Drinkware"
          ? "ONE SIP AT A TIME"
          : "EVERY SINGLE DAY",
        0.83,
        w * 0.053,
      ),
    );
  } else if (id === "outdoor-club") {
    elements.push(
      element("circle", {
        id: "design-sun",
        left: x,
        top: y + h * 0.22,
        width: w * 0.28,
        height: w * 0.28,
        fill: accent,
      }),
    );
    elements.push(
      element("rect", {
        id: "design-trail",
        left: x - w * 0.08,
        top: y + h * 0.37,
        width: w * 0.38,
        height: Math.max(8, h * 0.035),
        angle: -24,
        fill: ink,
      }),
      element("rect", {
        id: "design-trail-two",
        left: x + w * 0.14,
        top: y + h * 0.38,
        width: w * 0.24,
        height: Math.max(8, h * 0.035),
        angle: 24,
        fill: ink,
      }),
    );
    elements.push(
      text(
        "product-headline",
        "WANDER\nMORE",
        0.65,
        Math.min(w * 0.17, h * 0.21),
      ),
      text("product-subtitle", "ADVENTURE CLUB", 0.92, w * 0.052),
    );
  } else if (id === "studio-mark") {
    elements.push(
      element("circle", {
        id: "design-medallion",
        left: x,
        top: y + h * 0.35,
        width: Math.min(w * 0.58, h * 0.48),
        height: Math.min(w * 0.58, h * 0.48),
        fill: accent,
      }),
    );
    elements.push(
      text(
        "product-headline",
        "S",
        0.35,
        Math.min(w * 0.37, h * 0.35),
        ink,
        "Georgia",
      ),
      text("product-subtitle", "STUDIO CLUB", 0.75, w * 0.12),
      text("product-tagline", "PRINT YOUR STORY", 0.93, w * 0.05),
    );
  } else {
    ["#e88951", "#d5aa5c", "#357f88"].forEach((fill, i) =>
      elements.push(
        element("rect", {
          id: `design-stripe-${i}`,
          left: x,
          top: y + h * (0.12 + i * 0.07),
          width: w * 0.72,
          height: Math.max(8, h * 0.035),
          angle: -7,
          fill,
        }),
      ),
    );
    elements.push(
      text(
        "product-headline",
        "STAY\nCURIOUS",
        0.6,
        Math.min(w * 0.17, h * 0.23),
      ),
      text("product-subtitle", "CREATE YOUR OWN PATH", 0.94, w * 0.05),
    );
  }
  return { background: "#f4f5f6", elements };
}
