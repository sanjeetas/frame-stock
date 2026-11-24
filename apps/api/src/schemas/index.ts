import { z } from "zod";
import { customisation, productOptions } from "./customisation.js";
export const id = z.string().regex(/^[a-f\d]{24}$/i, "Invalid resource ID");
export const idParams = z.object({ id }).strict();
const email = z
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
const password = z
  .string()
  .min(12)
  .max(128)
  .refine(
    (v) => new TextEncoder().encode(v).length <= 256,
    "Password is too long",
  );
export const registerBody = z
  .object({ name: z.string().trim().min(2).max(100), email, password })
  .strict();
export const loginBody = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});
export const productQuery = pagination
  .extend({
    search: z.string().trim().max(100).optional(),
    category: z.string().max(100).optional(),
    libraryCategory: z.string().trim().max(60).optional(),
    customFamily: z.string().trim().min(1).max(60).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    group: z
      .enum([
        "Printing Products",
        "Gifting Items",
        "Customised Products",
        "Image Library",
      ])
      .optional(),
    sort: z.enum(["featured", "low", "high", "az"]).default("featured"),
  })
  .strict();
const preview = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      v === "" ||
      /^assets\/[\w.-]+$/.test(v) ||
      /^\/api\/previews\/[a-f\d]{32}\.(png|webp|jpg)$/.test(v) ||
      /^https:\/\//.test(v),
    "Use an HTTPS URL or a local preview path",
  );
export const productBody = z
  .object({
    customisation: customisation.optional(),
    title: z.string().trim().min(1).max(150),
    category: z.string().trim().min(1).max(100),
    group: z.enum([
      "Printing Products",
      "Gifting Items",
      "Customised Products",
      "Image Library",
    ]),
    libraryCategory: z.string().trim().min(1).max(60).optional(),
    sourceOrder: z.number().int().min(0).optional(),
    sourceProductId: z.number().int().positive().optional(),
    categoryIds: z.array(z.number().int().positive()).max(16).optional(),
    pricingMode: z.enum(["fixed", "discussion"]).optional(),
    priceDisplay: z.string().max(250).optional(),
    price: z.number().min(0).max(1e8).nullable(),
    unit: z.string().trim().min(1).max(30),
    description: z.string().max(2000).default(""),
    image: preview.default(""),
    editable: z.boolean().default(false),
    published: z.boolean().default(true),
    bg: z
      .string()
      .regex(/^#[a-f\d]{6}$/i)
      .default("#e7ecd9"),
    fg: z
      .string()
      .regex(/^#[a-f\d]{6}$/i)
      .default("#365044"),
    variant: z.number().int().min(0).max(100).default(0),
  })
  .strict();
const studioElement = z
  .object({
    id: z.string().regex(/^[\w-]{1,80}$/),
    type: z.enum(["text", "image", "rect", "circle"]),
    left: z.number().min(-4800).max(4800),
    top: z.number().min(-4800).max(4800),
    width: z.number().min(1).max(4800),
    height: z.number().min(1).max(4800),
    scaleX: z.number().min(0.01).max(20),
    scaleY: z.number().min(0.01).max(20),
    angle: z.number().min(-360).max(360),
    fill: z.string().regex(/^#[a-f\d]{6}$/i),
    opacity: z.number().min(0).max(1),
    locked: z.boolean(),
    text: z.string().max(500).optional(),
    fontFamily: z.enum(["Arial", "Georgia", "Verdana", "monospace"]).optional(),
    fontSize: z.number().min(8).max(200).optional(),
    fontWeight: z.enum(["normal", "bold"]).optional(),
    fontStyle: z.enum(["normal", "italic"]).optional(),
    underline: z.boolean().optional(),
    textAlign: z.enum(["left", "center", "right"]).optional(),
    lineHeight: z.number().min(0.5).max(3).optional(),
    productId: id.optional(),
    uploadId: id.optional(),
    flipX: z.boolean().optional(),
    flipY: z.boolean().optional(),
    charSpacing: z.number().min(-100).max(1000).optional(),
    crop: z
      .object({
        x: z.number().min(0).max(0.9),
        y: z.number().min(0).max(0.9),
        width: z.number().min(0.1).max(1),
        height: z.number().min(0.1).max(1),
      })
      .strict()
      .refine(
        (crop) =>
          crop.x + crop.width <= 1.000001 && crop.y + crop.height <= 1.000001,
        "Crop must stay inside the source image.",
      )
      .optional(),
    shadow: z
      .object({
        color: z.string().regex(/^#[a-f\d]{6}$/i),
        blur: z.number().min(0).max(50),
        offsetX: z.number().min(-50).max(50),
        offsetY: z.number().min(-50).max(50),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine(
    (value) => value.type !== "image" || !!value.productId !== !!value.uploadId,
    "Images require exactly one product or owned upload reference.",
  );
const studioPage = z
  .object({
    background: z.string().regex(/^#[a-f\d]{6}$/i),
    elements: z.array(studioElement).max(40),
  })
  .strict();
const studioDocument = z
  .object({
    version: z.literal(1),
    format: z.enum(["card", "product"]),
    surface: z.literal("magnet").optional(),
    mockupImage: z
      .string()
      .regex(/^assets\/(?:custom-[a-z-]+\.svg|mockups\/[a-z-]+\.webp)$/)
      .max(150)
      .optional(),
    mockupBackImage: z
      .string()
      .regex(/^assets\/mockups\/[a-z-]+\.webp$/)
      .max(150)
      .optional(),
    twoSided: z.boolean().optional(),
    productOptions: productOptions.optional(),
    productColour: z
      .string()
      .regex(/^#[a-f\d]{6}$/i)
      .optional(),
    shape: z.enum(["circle", "oval", "rounded", "heart", "starburst"]).optional(),
    printArea: customisation.shape.profile.shape.printArea,
    specification: z.string().max(150).optional(),
    width: z.number().int().min(200).max(2400),
    height: z.number().int().min(200).max(2400),
    template: z.string().max(40),
    pages: z.object({ front: studioPage, back: studioPage }).strict(),
  })
  .strict();
export const settings = z
  .object({
    studio: studioDocument.optional(),
    productOptions: productOptions.optional(),
    artworkApproved: z.boolean().optional(),
    headline: z.string().max(90),
    subtitle: z.string().max(140),
    bg: z.string().regex(/^#[a-f\d]{6}$/i),
    fg: z.string().regex(/^#[a-f\d]{6}$/i),
    font: z.enum(["Georgia", "Arial", "monospace"]),
    size: z.number().int().min(12).max(160),
    y: z.number().int().min(130).max(650),
    square: z.boolean(),
    hasUploadedImage: z.boolean().default(false),
    textX: z.number().min(0).max(100).optional(),
    textY: z.number().min(0).max(100).optional(),
    subtitleX: z.number().min(0).max(100).optional(),
    subtitleY: z.number().min(0).max(100).optional(),
    subtitleSize: z.number().int().min(12).max(100).optional(),
    imageX: z.number().min(0).max(100).optional(),
    imageY: z.number().min(0).max(100).optional(),
    imageScale: z.number().min(10).max(250).optional(),
    imageUploadId: id.optional(),
    imageProductId: id.optional(),
    baseProductId: id.optional(),
  })
  .strict();
export const designBody = z
  .object({ title: z.string().trim().min(1).max(100), settings })
  .strict();
export const orderBody = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().regex(/^\+?[\d ()-]{8,20}$/),
    address: z.string().max(1000).default(""),
    notes: z.string().max(2000).default(""),
    items: z
      .array(
        z
          .object({
            productId: id,
            quantity: z.number().int().min(1).max(10000),
            customization: z
              .object({
                requirements: z.string().max(2000).default(""),
                options: productOptions.optional(),
                design: settings.optional(),
              })
              .strict()
              .default({ requirements: "" }),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();
export const orderStatus = z
  .object({
    status: z.enum([
      "pending",
      "confirmed",
      "dispatched",
      "completed",
      "cancelled",
    ]),
  })
  .strict();
export const orderQuery = pagination
  .extend({
    status: orderStatus.shape.status.optional(),
    kind: z.enum(["image", "product"]).optional(),
  })
  .strict();
export const filenameQuery = z
  .object({
    filename: z
      .string()
      .min(1)
      .max(150)
      .regex(/^[\w .()-]+\.(png|jpe?g|webp|pdf|zip|psd|ai|eps|svg)$/i),
  })
  .strict();
export const downloadParams = z
  .object({ id, itemIndex: z.coerce.number().int().min(0).max(29) })
  .strict();
