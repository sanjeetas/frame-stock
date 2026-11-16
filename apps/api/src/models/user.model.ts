import { Schema, model } from "mongoose";
const schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      unique: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    active: { type: Boolean, default: true, required: true },
  },
  { timestamps: true, strict: "throw" },
);
export const User = model("User", schema);
export function userDto(u: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}) {
  return { id: String(u._id), name: u.name, email: u.email, role: u.role };
}
