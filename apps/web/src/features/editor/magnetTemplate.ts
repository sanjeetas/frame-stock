import { element, type StudioDocument } from "./studioTypes.ts";

export const magnetTemplates = [
  {
    id: "photo-caption",
    name: "Favourite Moment",
    photos: 1,
    colour: "Green",
    style: "Elegant",
    background: "#ffffff",
    ink: "#103759",
    photo: "#c8e9e7",
  },
  {
    id: "full-photo",
    name: "Full Photo",
    photos: 1,
    colour: "Blue",
    style: "Bold & Colourful",
    background: "#dbeafe",
    ink: "#163b68",
    photo: "#b9d8f6",
  },
  {
    id: "two-moments",
    name: "Together",
    photos: 2,
    colour: "Pink",
    style: "Elegant",
    background: "#fff1f5",
    ink: "#9d2854",
    photo: "#f5c4d6",
  },
  {
    id: "three-moments",
    name: "Little Adventures",
    photos: 3,
    colour: "Yellow",
    style: "Bold & Colourful",
    background: "#fff8da",
    ink: "#735217",
    photo: "#f5df9c",
  },
  {
    id: "memory-grid",
    name: "Memory Collage",
    photos: 4,
    colour: "Blue",
    style: "Bold & Colourful",
    background: "#eff6ff",
    ink: "#163b68",
    photo: "#b9d8f6",
  },
  {
    id: "minimal-note",
    name: "A Little Note",
    photos: 0,
    colour: "Cream",
    style: "Minimal",
    background: "#faf5e9",
    ink: "#4c5948",
    photo: "#e4e7d8",
  },
] as const;
export function isMagnetPhotoSlot(id = "") {
  return /^magnet-photo-placeholder(?:-[2-4])?$/.test(id);
}
export function magnetPhotoTarget(id = "") {
  return isMagnetPhotoSlot(id)
    ? id
    : /^magnet-photo-label(?:-[2-4])?$/.test(id)
      ? id.replace("-label", "-placeholder")
      : undefined;
}
export function filterMagnetTemplates(
  photos = "all",
  colour = "all",
  style = "all",
) {
  return magnetTemplates.filter(
    (t) =>
      (photos === "all" || String(t.photos) === photos) &&
      (colour === "all" || t.colour === colour) &&
      (style === "all" || t.style === style),
  );
}
/** Original editable layouts: each slot becomes the customer's image, never a refrigerator scene. */
export function magnetTemplate(
  width: number,
  height: number,
  id = "photo-caption",
): StudioDocument["pages"]["front"] {
  const t = magnetTemplates.find((t) => t.id === id) || magnetTemplates[0];
  const elements = [];
  const slots =
    t.photos === 4
      ? [
          [0.315, 0.315, 0.35, 0.35],
          [0.685, 0.315, 0.35, 0.35],
          [0.315, 0.685, 0.35, 0.35],
          [0.685, 0.685, 0.35, 0.35],
        ]
      : t.photos === 3
        ? [
            [0.315, 0.31, 0.35, 0.34],
            [0.685, 0.31, 0.35, 0.34],
            [0.5, 0.61, 0.72, 0.24],
          ]
        : t.photos === 2
          ? [
              [0.315, 0.43, 0.35, 0.56],
              [0.685, 0.43, 0.35, 0.56],
            ]
          : t.photos === 1
            ? [
                id === "full-photo"
                  ? [0.5, 0.5, 0.84, 0.84]
                  : [0.5, 0.42, 0.72, 0.56],
              ]
            : [];
  for (const [i, slot] of slots.entries()) {
    const [x, y, w, h] = slot as [number, number, number, number];
    const suffix = i ? `-${i + 1}` : "";
    elements.push(
      element("rect", {
        id: `magnet-photo-placeholder${suffix}`,
        left: width * x,
        top: height * y,
        width: width * w,
        height: height * h,
        fill: t.photo,
      }),
    );
    elements.push(
      element("text", {
        id: `magnet-photo-label${suffix}`,
        left: width * x,
        top: height * y,
        width: width * w * 0.9,
        height: 60,
        text: t.photos > 1 ? `PHOTO ${i + 1}` : "YOUR PHOTO",
        fontSize: t.photos > 1 ? 30 : 42,
        fontFamily: "Arial",
        textAlign: "center",
        fill: t.ink,
      }),
    );
  }
  if (id !== "full-photo" && t.photos !== 4)
    elements.push(
      element("text", {
        id: "magnet-caption",
        left: width / 2,
        top: height * (t.photos ? 0.79 : 0.5),
        width: width * 0.72,
        height: 60,
        text:
          t.photos === 0
            ? "You make every day special"
            : t.photos === 1
              ? "Our favourite moment"
              : t.name,
        fontSize: 38,
        fontFamily: "Georgia",
        textAlign: "center",
        fill: t.ink,
      }),
    );
  return { background: t.background, elements };
}
export function applyMagnetLayout(
  document: StudioDocument,
  id: string,
): StudioDocument {
  const page = magnetTemplate(document.width, document.height, id);
  const photos = document.pages.front.elements.filter(
    (e) => e.type === "image",
  );
  const slots = page.elements.filter((e) => isMagnetPhotoSlot(e.id));
  for (const [i, photo] of photos.entries()) {
    const slot = slots[i];
    if (!slot) break;
    page.elements = page.elements.filter(
      (e) => e.id !== slot.id.replace("-placeholder", "-label"),
    );
    page.elements[page.elements.findIndex((e) => e.id === slot.id)] = {
      ...photo,
      id: slot.id,
      left: slot.left,
      top: slot.top,
      width: slot.width,
      height: slot.height,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
    };
  }
  const caption = document.pages.front.elements.find(
    (e) => e.id === "magnet-caption",
  );
  const target = page.elements.find((e) => e.id === "magnet-caption");
  if (
    caption?.text &&
    target &&
    !magnetTemplates.some((t) => t.name === caption.text) &&
    !["Our favourite moment", "You make every day special"].includes(
      caption.text,
    )
  )
    target.text = caption.text;
  return {
    ...document,
    template: id,
    pages: { ...document.pages, front: page },
  };
}
