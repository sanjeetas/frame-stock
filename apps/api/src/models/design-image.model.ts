import { Schema, model } from "mongoose";
const schema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gridfsId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
export const DesignImage = model("DesignImage", schema);
