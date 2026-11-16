import { Schema, model } from "mongoose";
const schema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 100 },
    settings: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);
schema.index({ owner: 1, updatedAt: -1 });
export const Design = model("Design", schema);
export function designDto(d: any) {
  return {
    id: String(d._id),
    title: d.title,
    settings: d.settings,
    updatedAt: d.updatedAt,
  };
}
