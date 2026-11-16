import { Schema, model } from "mongoose";
const item = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    title: { type: String, required: true },
    kind: { type: String, enum: ["image", "product"], required: true },
    unit: { type: String, required: true },
    unitPrice: { type: Number, min: 0, default: null },
    quantity: { type: Number, min: 1, max: 10000, required: true },
    customization: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);
const schema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, maxlength: 100 },
    phone: { type: String, required: true, maxlength: 25 },
    address: { type: String, maxlength: 1000, default: "" },
    notes: { type: String, maxlength: 2000, default: "" },
    items: {
      type: [item],
      required: true,
      validate: (v: unknown[]) => v.length > 0 && v.length <= 30,
    },
    total: { type: Number, min: 0, required: true },
    needsQuote: { type: Boolean, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "dispatched", "completed", "cancelled"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true },
);
schema.index({ owner: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
export const Order = model("Order", schema);
export function orderDto(o: any) {
  return {
    id: String(o._id),
    name: o.name,
    phone: o.phone,
    address: o.address,
    notes: o.notes,
    items: o.items.map((i: any) => ({
      productId: String(i.product),
      title: i.title,
      kind: i.kind,
      unit: i.unit,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      customization: i.customization,
    })),
    total: o.total,
    needsQuote: o.needsQuote,
    status: o.status,
    createdAt: o.createdAt,
  };
}
