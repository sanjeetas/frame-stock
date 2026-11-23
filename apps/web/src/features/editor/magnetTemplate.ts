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
  {
    id: "festive-frame",
    name: "Celebration Frame",
    photos: 1,
    colour: "Red",
    style: "Elegant",
    background: "#a92b32",
    ink: "#fff5de",
    photo: "#d6d6d6",
  },
  {
    id: "calendar-gold",
    name: "Golden Photo Calendar",
    photos: 1,
    colour: "Yellow",
    style: "Elegant",
    background: "#fffdf5",
    ink: "#664d25",
    photo: "#d6d6d6",
  },
  {
    id: "calendar-sage",
    name: "Sage Photo Calendar",
    photos: 1,
    colour: "Green",
    style: "Minimal",
    background: "#dcebe1",
    ink: "#355d47",
    photo: "#d6d6d6",
  },
  {
    id: "business-classic",
    name: "Classic Company Magnet",
    photos: 0,
    colour: "Black",
    style: "Minimal",
    background: "#111111",
    ink: "#ffffff",
    photo: "#d6d6d6",
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
  search = "",
) {
  return magnetTemplates.filter(
    (t) =>
      (photos === "all" || String(t.photos) === photos) &&
      (colour === "all" || t.colour === colour) &&
      (style === "all" || t.style === style) &&
      `${t.name} ${t.colour} ${t.style} ${t.photos} photos`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
}
/** Original editable layouts: each slot becomes the customer's image, never a refrigerator scene. */
export function magnetTemplate(
  width: number,
  height: number,
  id = "photo-caption",
  year = new Date().getUTCFullYear() + 1,
  shape?: StudioDocument["shape"],
): StudioDocument["pages"]["front"] {
  const t = magnetTemplates.find((t) => t.id === id) || magnetTemplates[0];
  const elements = [];
  const calendar = id.startsWith("calendar-");
  const slots = calendar
    ? [[0.3, 0.48, 0.36, 0.65]]
    : t.photos === 4
      ? [
          [0.315, 0.29, 0.35, 0.29],
          [0.685, 0.29, 0.35, 0.29],
          [0.315, 0.6, 0.35, 0.29],
          [0.685, 0.6, 0.35, 0.29],
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
  if (id === "festive-frame") {
    elements.push(
      element("rect", {
        id: "festive-border",
        left: width / 2,
        top: height * 0.42,
        width: width * 0.77,
        height: height * 0.62,
        fill: "#e4b968",
      }),
    );
  }
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
  if (id !== "full-photo" && !calendar && id !== "business-classic")
    elements.push(
      element("text", {
        id: "magnet-caption",
        left: width / 2,
        top: height * (t.photos ? shape === "heart" ? 0.70 : 0.79 : 0.5),
        width: width * (shape === "heart" ? 0.5 : 0.72),
        height: 60,
        text:
          t.photos === 0
            ? "You make every day special"
            : t.photos === 1
              ? "Our favourite moment"
              : t.name,
        fontSize: shape === "heart" ? 32 : 38,
        fontFamily: "Georgia",
        textAlign: "center",
        fill: t.ink,
      }),
    );
  if (id === "business-classic") {
    for (const [i, text] of ["H", "COMPANY NAME", "Phone / Other"].entries())
      elements.push(
        element("text", {
          id: `business-${i}`,
          left: width / 2,
          top: height * (0.32 + i * 0.19),
          width: width * 0.75,
          height: 70,
          text,
          fontFamily: i === 0 ? "Georgia" : "Arial",
          fontSize: i === 0 ? 90 : 42,
          textAlign: "center",
          fill: t.ink,
        }),
      );
  }
  if (calendar) {
    const safeYear = Math.max(2020, Math.min(2100, Math.trunc(year) || 2027));
    elements.push(
      element("text", {
        id: "calendar-year",
        left: width * 0.7,
        top: height * 0.15,
        width: width * 0.36,
        height: 60,
        text: String(safeYear),
        fontSize: 42,
        fontFamily: "Georgia",
        textAlign: "center",
        fill: t.ink,
      }),
    );
    for (let month = 0; month < 12; month++) {
      elements.push(
        element("text", {
          id: `calendar-month-${month}`,
          left: width * (0.565 + (month % 3) * 0.125),
          top: height * (0.29 + Math.floor(month / 3) * 0.175),
          width: width * 0.12,
          height: height * 0.15,
          text: calendarMonthText(safeYear, month),
          fontSize: Math.max(8, width * 0.008),
          fontFamily: "monospace",
          textAlign: "center",
          lineHeight: 1.2,
          fill: t.ink,
        }),
      );
    }
  }
  return { background: t.background, elements };
}
export function applyMagnetLayout(
  document: StudioDocument,
  id: string,
  year?: number,
): StudioDocument {
  const page = magnetTemplate(document.width, document.height, id, year, document.shape);
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

/** Monday-first Gregorian calendar, generated rather than an uneditable stock picture. */
export function calendarMonthText(year: number, month: number) {
  const name = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ][month];
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array.from(
    { length: Math.ceil((offset + days) / 7) * 7 },
    (_, i) =>
      i < offset || i >= offset + days
        ? "  "
        : String(i - offset + 1).padStart(2),
  );
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7)
    weeks.push(cells.slice(i, i + 7).join(" "));
  return [name, "Mo Tu We Th Fr Sa Su", ...weeks].join("\n");
}
