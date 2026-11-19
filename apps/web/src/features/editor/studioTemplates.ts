import { magnetTemplate } from "./magnetTemplate.ts";
import type { Product, DesignSettings } from "../../types/index.ts";
import {
  element,
  type StudioDocument,
  type StudioElement,
} from "./studioTypes.ts";
import { layerPosition } from "./editorGeometry.ts";
export const studioTemplates = [
  {
    id: "classic",
    name: "Classic Navy",
    color: "#103759",
    background: "#ffffff",
  },
  {
    id: "colour",
    name: "Colour Studio",
    color: "#b91c70",
    background: "#ffffff",
  },
  {
    id: "minimal",
    name: "Minimal Sage",
    color: "#356453",
    background: "#f2f6ef",
  },
  { id: "dark", name: "Midnight", color: "#e9c77b", background: "#14283e" },
];
export function createCardTemplate(template = "classic"): StudioDocument {
  const theme =
    studioTemplates.find((item) => item.id === template) || studioTemplates[0]!;
  const ink = theme.color,
    fg = template === "dark" ? "#ffffff" : ink;
  const text = (
    id: string,
    content: string,
    x: number,
    y: number,
    width: number,
    size = 26,
    align: "left" | "right" | "center" = "left",
  ) =>
    element("text", {
      id,
      text: content,
      left: x,
      top: y,
      width,
      height: size * 1.3,
      fontSize: size,
      fontFamily: "Georgia",
      fontWeight: "normal",
      fontStyle: "normal",
      underline: false,
      textAlign: align,
      lineHeight: 1.16,
      fill: fg,
    });
  const front: StudioElement[] = [
    element("rect", {
      id: "logo-placeholder",
      left: 130,
      top: 160,
      width: 120,
      height: 120,
      fill: template === "dark" ? "#29435c" : "#e3e9ef",
    }),
    text("logo-label", "YOUR LOGO", 130, 160, 105, 15, "center"),
    text("company", "Company Name", 485, 130, 570, 42),
    text("tagline", "Your tagline here", 485, 185, 570, 24),
    text("name", "Full Name", 650, 280, 400, 30, "right"),
    text("job", "Job Title", 650, 325, 400, 24, "right"),
    text("email", "hello@yourcompany.com", 650, 366, 400, 23, "right"),
    element("rect", {
      id: "brand-line",
      left: 470,
      top: 408,
      width: 800,
      height: 7,
      fill: ink,
    }),
    text("address", "Address Line 1", 285, 445, 430, 23),
    text("address-two", "Address Line 2", 285, 485, 430, 23),
    text("web", "www.yourcompany.com", 285, 525, 430, 23),
    text("phone", "+91 00000 00000", 695, 485, 310, 23, "right"),
  ];
  if (template === "colour")
    front.push(
      element("circle", {
        id: "colour-accent",
        left: 890,
        top: 45,
        width: 55,
        height: 55,
        fill: "#07b9dd",
      }),
    );
  if (template === "minimal") {
    front.splice(
      0,
      front.length,
      text("company", "Company Name", 470, 130, 800, 48, "center"),
      text("tagline", "Less, but better.", 470, 195, 800, 24, "center"),
      element("rect", {
        id: "brand-line",
        left: 470,
        top: 255,
        width: 100,
        height: 4,
        fill: ink,
      }),
      text("name", "Full Name", 275, 345, 410, 32),
      text("job", "Job Title", 275, 390, 410, 25),
      text("email", "hello@yourcompany.com", 665, 345, 390, 24, "right"),
      text("phone", "+91 00000 00000", 665, 390, 390, 24, "right"),
      text("address", "Address Line 1, City", 470, 480, 800, 24, "center"),
      text("web", "www.yourcompany.com", 470, 525, 800, 23, "center"),
    );
  }
  if (template === "colour") {
    front.unshift(
      element("rect", {
        id: "colour-stripe",
        left: 14,
        top: 290,
        width: 28,
        height: 580,
        fill: ink,
      }),
    );
    front.find((item) => item.id === "brand-line")!.fill = "#07b9dd";
  }
  if (template === "dark") {
    front.splice(
      0,
      front.length,
      element("rect", {
        id: "gold-line",
        left: 470,
        top: 290,
        width: 2,
        height: 450,
        fill: ink,
      }),
      {
        ...text("company", "Company Name", 245, 240, 350, 46, "center"),
        fill: ink,
      },
      text("tagline", "Distinctive by design.", 245, 320, 350, 24, "center"),
      text("name", "Full Name", 700, 165, 340, 34),
      text("job", "Job Title", 700, 215, 340, 24),
      text("email", "hello@yourcompany.com", 700, 305, 340, 24),
      text("phone", "+91 00000 00000", 700, 350, 340, 24),
      text("address", "Address Line 1", 700, 425, 340, 24),
      text("web", "www.yourcompany.com", 700, 475, 340, 23),
    );
  }
  return {
    version: 1,
    format: "card",
    width: 940,
    height: 580,
    template,
    pages: {
      front: { background: theme.background, elements: front },
      back: {
        background: ink,
        elements: [
          {
            ...text(
              "back-company",
              "Company Name",
              470,
              250,
              780,
              54,
              "center",
            ),
            fill: theme.background,
          },
          {
            ...text(
              "back-tagline",
              "Your brand. Your story.",
              470,
              320,
              780,
              28,
              "center",
            ),
            fill: theme.background,
          },
        ],
      },
    },
  };
}
export function createStudioDocument(
  settings: DesignSettings,
  card = false,
): StudioDocument {
  if (settings.studio) return structuredClone(settings.studio);
  if (card) return createCardTemplate();
  const width = 1200,
    height = settings.square ? 1200 : 900;
  const elements: StudioElement[] = [];
  for (const layer of ["headline", "subtitle"] as const) {
    const content =
      layer === "headline" ? settings.headline : settings.subtitle;
    if (!content) continue;
    const position = layerPosition(settings, layer),
      size =
        layer === "headline" ? settings.size : (settings.subtitleSize ?? 24);
    elements.push(
      element("text", {
        id: layer,
        left: (position.x / 100) * width,
        top: (position.y / 100) * height - size * 0.4,
        width: 1050,
        height: size * 1.3,
        text: content,
        fontSize: size,
        fontFamily: settings.font,
        fontWeight: "normal",
        fontStyle: "normal",
        underline: false,
        textAlign: "center",
        lineHeight: 1.2,
        fill: settings.fg,
      }),
    );
  }
  if (settings.imageUploadId || settings.imageProductId) {
    const position = layerPosition(settings, "image");
    elements.unshift(
      element("image", {
        id: "selected-image",
        left: (position.x / 100) * width,
        top: (position.y / 100) * height,
        width: settings.baseProductId ? 440 : 1120,
        height: settings.baseProductId ? 340 : height - 80,
        scaleX: (settings.imageScale ?? 100) / 100,
        scaleY: (settings.imageScale ?? 100) / 100,
        ...(settings.imageUploadId
          ? { uploadId: settings.imageUploadId }
          : { productId: settings.imageProductId }),
      }),
    );
  }
  return {
    version: 1,
    format: "product",
    width,
    height,
    template: "custom",
    pages: {
      front: { background: settings.bg, elements },
      back: { background: settings.bg, elements: [] },
    },
  };
}

/** Configure the same editor from bounded product metadata, rather than one editor per SKU. */
export function createProductSettings(
  product: Product,
  options: Record<string, string>,
  previous?: DesignSettings,
): DesignSettings {
  const config = product.customisation;
  const settings: DesignSettings = {
    ...(previous || {
      headline: "",
      subtitle: "",
      bg: "#ffffff",
      fg: "#103759",
      font: "Arial",
      size: 48,
      y: 300,
      square: false,
      hasUploadedImage: false,
    }),
    productOptions: { ...options },
    artworkApproved: false,
    baseProductId: product.id,
  };
  if (!config) return settings;
  const p = config.profile;
  let doc = previous?.studio
    ? structuredClone(previous.studio)
    : createStudioDocument(
        { ...settings, studio: undefined },
        config.family === "Visiting Cards",
      );
  if (!previous?.studio) {
    const x = p.width / doc.width,
      y = p.height / doc.height,
      scale = Math.min(x, y);
    for (const page of Object.values(doc.pages))
      for (const el of page.elements) {
        el.left *= x;
        el.top *= y;
        el.scaleX *= scale;
        el.scaleY *= scale;
      }
    doc.width = p.width;
    doc.height = p.height;
  }
  const colours: Record<string, string> = {
    White: "#ffffff",
    Black: "#24282d",
    Navy: "#153752",
    Red: "#bd2343",
    Natural: "#e7d8b8",
  };
  doc.productColour = p.mockup ? colours[options.colour || ""] : undefined;
  doc.twoSided = p.twoSided;
  doc.shape =
    options.shape === "Circle"
      ? "circle"
      : options.shape === "Rounded corners"
        ? "rounded"
        : options.shape === "Rectangle"
          ? undefined
          : p.shape;
  if (!p.mockup && options.orientation) {
    const width =
      options.orientation === "Portrait"
        ? 900
        : options.orientation === "Landscape"
          ? 1200
          : p.width;
    const height =
      options.orientation === "Portrait"
        ? 1200
        : options.orientation === "Landscape"
          ? 900
          : p.height;
    const x = width / doc.width,
      y = height / doc.height;
    for (const page of Object.values(doc.pages))
      for (const el of page.elements) {
        el.left *= x;
        el.top *= y;
        el.scaleX *= x;
        el.scaleY *= y;
      }
    doc.width = width;
    doc.height = height;
  }
  doc.mockupImage = p.mockup && p.mockupImage ? p.mockupImage : undefined;
  doc.printArea = p.printArea;
  doc.specification = p.label;
  if (config.family === "Magnets" && product.title !== "Magnet Calendars") {
    doc.surface = "magnet";
    doc.shape =
      options.shape === "Rectangle" ? undefined : doc.shape || "rounded";
    doc.printArea = { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
    if (!previous?.studio) {
      doc.template = "photo-caption";
      doc.pages.front = magnetTemplate(doc.width, doc.height);
    }
  }
  settings.studio = doc;
  return settings;
}
