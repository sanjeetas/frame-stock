import { Schema, model } from "mongoose";
// A single atomic reservation counter prevents concurrent uploads filling the free tier.
const schema = new Schema(
  {
    _id: { type: String, required: true },
    bytes: { type: Number, required: true, min: 0, default: 0 },
  },
  { versionKey: false },
);
export const StorageUsage = model("StorageUsage", schema);
