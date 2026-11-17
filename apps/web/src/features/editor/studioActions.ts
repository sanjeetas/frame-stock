import type { StudioDocument, StudioElement } from "./studioTypes";
export function safeMargin(document: StudioDocument) {
  return document.format === "card"
    ? 30
    : Math.min(document.width, document.height) * 0.04;
}
export function resizeStudio(
  document: StudioDocument,
  width: number,
  height: number,
): StudioDocument {
  const x = width / document.width,
    y = height / document.height,
    scale = Math.min(x, y);
  return {
    ...document,
    width,
    height,
    pages: Object.fromEntries(
      Object.entries(document.pages).map(([side, page]) => [
        side,
        {
          ...page,
          elements: page.elements.map((element) => ({
            ...element,
            left: element.left * x,
            top: element.top * y,
            scaleX: element.scaleX * scale,
            scaleY: element.scaleY * scale,
          })),
        },
      ]),
    ) as StudioDocument["pages"],
  };
}
export function artworkWarnings(document: StudioDocument): string[] {
  const warnings: string[] = [];
  const margin = safeMargin(document);
  const placeholders =
    /^(Company Name|Company Message|Your tagline here|Your brand\. Your story\.|Full Name|Job Title|Email \/ Other|Address Line [12]|Phone \/ Other|Web \/ Other|hello@yourcompany\.com|www\.yourcompany\.com|\+91 00000 00000)$/i;
  for (const [side, page] of Object.entries(document.pages)) {
    if (side === "front" && !page.elements.length)
      warnings.push("The front artwork is empty.");
    if (
      page.elements.some(
        (element) =>
          element.id === "logo-placeholder" || element.id === "logo-label",
      )
    )
      warnings.push(
        `${side === "front" ? "Front" : "Back"}: the logo placeholder has not been replaced.`,
      );
    if (
      page.elements.some(
        (element) =>
          element.type === "text" &&
          placeholders.test(element.text?.trim() || ""),
      )
    )
      warnings.push(
        `${side === "front" ? "Front" : "Back"}: template placeholder text is still present.`,
      );
    if (
      page.elements.some((element) => {
        if (element.type !== "text" || !element.text?.trim()) return false;
        const a = (element.angle * Math.PI) / 180,
          w = element.width * element.scaleX,
          h = element.height * element.scaleY;
        const halfW =
            (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2,
          halfH = (Math.abs(w * Math.sin(a)) + Math.abs(h * Math.cos(a))) / 2;
        return (
          element.left - halfW < margin ||
          element.top - halfH < margin ||
          element.left + halfW > document.width - margin ||
          element.top + halfH > document.height - margin
        );
      })
    )
      warnings.push(
        `${side === "front" ? "Front" : "Back"}: some text is outside the safety area.`,
      );
  }
  return warnings;
}
export function cropPixels(
  width: number,
  height: number,
  crop: StudioElement["crop"],
) {
  const region = crop || { x: 0, y: 0, width: 1, height: 1 };
  return {
    cropX: region.x * width,
    cropY: region.y * height,
    width: region.width * width,
    height: region.height * height,
  };
}
