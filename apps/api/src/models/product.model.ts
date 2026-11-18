import { Schema, model } from "mongoose";
const option = new Schema(
  {
    key: { type: String, required: true, maxlength: 40 },
    label: { type: String, required: true, maxlength: 60 },
    values: {
      type: [String],
      required: true,
      validate: (v: string[]) => v.length > 0 && v.length <= 20,
    },
  },
  { _id: false },
);
const customisationSchema = new Schema(
  {
    family: { type: String, required: true, maxlength: 60 },
    quoteRequired: { type: Boolean, required: true },
    options: { type: [option], validate: (v: unknown[]) => v.length <= 8 },
    profile: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false },
);
const schema = new Schema(
  {
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, maxlength: 100, index: true },
    group: {
      type: String,
      required: true,
      enum: [
        "Printing Products",
        "Gifting Items",
        "Customised Products",
        "Image Library",
      ],
      index: true,
    },
    libraryCategory: { type: String, maxlength: 60, index: true },
    customisation: { type: customisationSchema, default: undefined },
    sourceOrder: { type: Number, min: 0, default: 100000 },
    sourceProductId: { type: Number, min: 1 },
    sourceVersion: { type: String },
    categoryIds: {
      type: [Number],
      default: [],
      validate: (ids: number[]) => ids.length <= 16,
    },
    priceDisplay: { type: String, maxlength: 250, default: "" },
    price: { type: Number, min: 0, default: null },
    unit: { type: String, required: true, maxlength: 30, default: "item" },
    description: { type: String, maxlength: 2000, default: "" },
    kind: { type: String, enum: ["product", "image"], required: true },
    image: { type: String, maxlength: 2000, default: "" },
    editable: { type: Boolean, default: false },
    published: { type: Boolean, default: true, index: true },
    bg: { type: String, default: "#e7ecd9" },
    fg: { type: String, default: "#365044" },
    variant: { type: Number, default: 0 },
    hasFile: { type: Boolean, default: false },
    originalFile: {
      type: new Schema(
        {
          gridfsId: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
        },
        { _id: false },
      ),
      select: false,
    },
  },
  { timestamps: true, strict: "throw" },
);
schema.index({ published: 1, group: 1, createdAt: -1 });
schema.index({ published: 1, categoryIds: 1 });
schema.index({ published: 1, "customisation.family": 1 });
export const Product = model("Product", schema);
export function productDto(p: any) {
  return {
    id: String(p._id),
    slug: p.slug,
    title: p.title,
    category: p.category,
    group: p.group,
    customisation: p.customisation?.toObject
      ? p.customisation.toObject()
      : p.customisation,
    libraryCategory: p.libraryCategory,
    sourceProductId: p.sourceProductId,
    categoryIds: p.categoryIds,
    priceDisplay: p.priceDisplay,
    price: p.price,
    unit: p.unit,
    description: p.description,
    kind: p.kind,
    image: p.image,
    editable: p.editable,
    published: p.published,
    bg: p.bg,
    fg: p.fg,
    variant: p.variant,
    hasFile: p.hasFile,
  };
}
