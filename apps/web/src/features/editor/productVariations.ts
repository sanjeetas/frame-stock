import { magnetTemplate } from "./magnetTemplate.ts";
import type { DesignSettings, Product } from "../../types/index.ts";
import {
  createCardTemplate,
  createProductSettings,
  studioTemplates,
} from "./studioTemplates.ts";
import { resizeStudio } from "./studioActions.ts";
import { element, type StudioElement } from "./studioTypes.ts";

export const productVariations = [
  {
    id: "photo-message",
    name: "Photo & Message",
    colour: "#103759",
    background: "#ffffff",
    photo: true,
  },
  {
    id: "logo-name",
    name: "Logo & Name",
    colour: "#184a42",
    background: "#eff6f0",
    photo: true,
  },
  {
    id: "clean-type",
    name: "Simple Typography",
    colour: "#103759",
    background: "#ffffff",
    photo: false,
  },
  {
    id: "colour-block",
    name: "Colour Studio",
    colour: "#9b2566",
    background: "#fff0f6",
    photo: false,
  },
  {
    id: "full-photo",
    name: "Full Photo",
    colour: "#103759",
    background: "#ffffff",
    photo: true,
  },
  {
    id: "upload-design",
    name: "Your Own Design",
    colour: "#103759",
    background: "#ffffff",
    photo: false,
  },
] as const;
export function isCalendarProduct(product: Product) {
  return (
    /calendar/i.test(product.title) &&
    ["Calendars & Diaries", "Magnets"].includes(
      product.customisation?.family || "",
    )
  );
}
export function variationsForProduct(product: Product) {
  if (isCalendarProduct(product))
    return [
      { id: "calendar-gold", name: "Photo Calendar" },
      { id: "calendar-sage", name: "Sage Calendar" },
      { id: "calendar-plain", name: "Classic Calendar" },
      { id: "upload-design", name: "Your Own Design" },
    ];
  if (product.customisation?.family === "Visiting Cards")
    return studioTemplates.map((t) => ({ id: t.id, name: t.name }));
  if (
    [
      "Stamps & Embossers",
      "Pens & Card Holders",
      "Caps & Accessories",
    ].includes(product.customisation?.family || "")
  )
    return productVariations.filter((t) =>
      ["logo-name", "clean-type", "upload-design"].includes(t.id),
    );
  return productVariations;
}
export function isProductPhotoSlot(id = "") {
  return id === "product-photo-placeholder" || id === "product-photo-label";
}
export function productVariation(
  product: Product,
  options: Record<string, string>,
  id: string,
  previous?: DesignSettings,
  year = new Date().getUTCFullYear() + 1,
): DesignSettings {
  const configured = createProductSettings(product, options, previous);
  if (!configured.studio) return configured;
  let scene = configured.studio;
  if (isCalendarProduct(product) && id.startsWith("calendar-")) {
    const page = magnetTemplate(
      scene.width,
      scene.height,
      id === "calendar-sage" ? id : "calendar-gold",
      year,
    );
    page.elements = page.elements.map((e) => ({
      ...e,
      id: e.id.replace("magnet-photo-", "product-photo-"),
    }));
    if (id === "calendar-plain") {
      page.background = "#ffffff";
      page.elements = page.elements.filter(
        (e) => !e.id.startsWith("product-photo-"),
      );
      for (const item of page.elements) {
        item.fill = "#103759";
        if (item.id === "calendar-year") {
          item.left = scene.width / 2;
          item.width = scene.width * 0.8;
        }
        if (item.id.startsWith("calendar-month-")) {
          const month = Number(item.id.slice("calendar-month-".length));
          item.left = scene.width * (0.23 + (month % 3) * 0.27);
          item.width = scene.width * 0.24;
          item.fontSize = Math.max(8, scene.width * 0.012);
        }
      }
    }
    const oldPhoto = previous?.studio?.pages.front.elements.find(
      (e) => e.type === "image",
    );
    const slot = page.elements.find(
      (e) => e.id === "product-photo-placeholder",
    );
    if (oldPhoto && slot) {
      page.elements[page.elements.indexOf(slot)] = {
        ...oldPhoto,
        id: slot.id,
        left: slot.left,
        top: slot.top,
        width: slot.width,
        height: slot.height,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
      };
      page.elements = page.elements.filter(
        (e) => e.id !== "product-photo-label",
      );
    }
    scene = {
      ...scene,
      template: id,
      pages: {
        front: page,
        back: { background: page.background, elements: [] },
      },
    };
  } else if (scene.format === "card") {
    const template = resizeStudio(
      createCardTemplate(id),
      scene.width,
      scene.height,
    );
    scene = { ...scene, template: id, pages: template.pages };
  } else {
    const theme =
      productVariations.find((t) => t.id === id) || productVariations[0];
    const area = scene.printArea || {
      x: 0.06,
      y: 0.06,
      width: 0.88,
      height: 0.88,
    };
    const x = (area.x + area.width / 2) * scene.width;
    const y = area.y * scene.height,
      w = area.width * scene.width,
      h = area.height * scene.height;
    const fontSize = Math.max(12, Math.min(44, w * 0.09, h * 0.17));
    const elements: StudioElement[] = [];
    if (id !== "upload-design") {
      elements.push(
        element("rect", {
          id: "design-background",
          locked: true,
          left: x,
          top: y + h / 2,
          width: w,
          height: h,
          fill: theme.background,
        }),
      );
      if (theme.photo) {
        const photo = element("rect", {
          id: "product-photo-placeholder",
          left: x,
          top: y + h * (id === "full-photo" ? 0.5 : 0.36),
          width: w * 0.88,
          height: h * (id === "full-photo" ? 0.9 : 0.56),
          fill: "#e0e6eb",
        });
        elements.push(
          photo,
          element("text", {
            id: "product-photo-label",
            left: photo.left,
            top: photo.top,
            width: photo.width * 0.9,
            height: 50,
            text: id === "logo-name" ? "YOUR LOGO" : "YOUR PHOTO",
            fontSize: Math.max(12, fontSize * 0.65),
            fontFamily: "Arial",
            textAlign: "center",
            fill: "#526577",
          }),
        );
      }
      if (id !== "full-photo")
        elements.push(
          element("text", {
            id: "product-headline",
            left: x,
            top: y + h * (theme.photo ? 0.78 : 0.38),
            width: w * 0.85,
            height: 60,
            text: id === "logo-name" ? "Your company name" : "Your text here",
            fontSize,
            fontFamily: "Arial",
            textAlign: "center",
            fill: theme.colour,
          }),
          element("text", {
            id: "product-subtitle",
            left: x,
            top: y + h * (theme.photo ? 0.92 : 0.63),
            width: w * 0.85,
            height: 45,
            text: "Make it yours",
            fontSize: Math.max(10, fontSize * 0.55),
            fontFamily: "Arial",
            textAlign: "center",
            fill: theme.colour,
          }),
        );
    }
    const oldImage = previous?.studio?.pages.front.elements.find(
      (e) => e.type === "image",
    );
    const slot = elements.find((e) => e.id === "product-photo-placeholder");
    if (oldImage && slot) {
      const index = elements.indexOf(slot);
      elements[index] = {
        ...oldImage,
        id: slot.id,
        left: slot.left,
        top: slot.top,
        width: slot.width,
        height: slot.height,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
      };
      elements.splice(
        elements.findIndex((e) => e.id === "product-photo-label"),
        1,
      );
    }
    scene = {
      ...scene,
      template: id,
      pages: {
        front: { background: "#ffffff", elements },
        back: { background: "#ffffff", elements: [] },
      },
    };
  }
  return { ...configured, studio: scene, artworkApproved: false };
}
