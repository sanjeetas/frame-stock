import { randomBytes } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import { resolve, join } from "node:path";
import sharp from "sharp";
import { Product } from "../models/product.model.js";
import { ownedOrder } from "./order.service.js";
import { AppError } from "../lib.js";
import type { Config } from "../config/env.js";
export async function saveOriginal(
  id: string,
  bytes: Buffer,
  name: string,
  config: Config,
) {
  if (!Buffer.isBuffer(bytes) || !bytes.length)
    throw new AppError(400, "INVALID_FILE", "Choose a file to upload.");
  const product = await Product.findById(id);
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found.");
  const folder = resolve(config.DATA_DIR, "originals");
  await mkdir(folder, { recursive: true });
  const path = join(folder, randomBytes(24).toString("hex"));
  await writeFile(path, bytes, { mode: 0o600 });
  product.set("originalFile", { path, name });
  product.hasFile = true;
  await product.save();
  return { uploaded: true };
}
export async function savePreview(id: string, bytes: Buffer, config: Config) {
  const product = await Product.findById(id);
  if (!product) throw new AppError(404, "NOT_FOUND", "Product not found.");
  let output: Buffer;
  try {
    const metadata = await sharp(bytes, {
      limitInputPixels: 25000000,
    }).metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format ?? ""))
      throw new Error("Unsupported");
    const resized = await sharp(bytes, { limitInputPixels: 25000000 })
      .rotate()
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    if (product.kind === "image") {
      const info = await sharp(resized).metadata();
      const watermark = Buffer.from(
        `<svg width="${info.width}" height="${info.height}"><defs><pattern id="w" width="210" height="110" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><text x="5" y="50" fill="#fff" stroke="#16344b" stroke-width="0.4" opacity="0.5" font-size="19" font-family="Arial">PHULO PREVIEW</text></pattern></defs><rect width="100%" height="100%" fill="url(#w)"/></svg>`,
      );
      output = await sharp(resized)
        .composite([{ input: watermark }])
        .png()
        .toBuffer();
    } else output = resized;
  } catch {
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "Choose a PNG, JPEG or WebP image with at most 25 million pixels.",
    );
  }
  const name = randomBytes(16).toString("hex") + ".png",
    folder = resolve(config.DATA_DIR, "previews");
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, name), output);
  product.image = "/api/previews/" + name;
  await product.save();
  return { image: product.image };
}
export async function downloadFile(
  orderId: string,
  index: number,
  userId: string,
) {
  const order = await ownedOrder(orderId, userId);
  if (order.status !== "completed")
    throw new AppError(
      403,
      "PAYMENT_REQUIRED",
      "HD downloads are available after payment verification.",
    );
  const item = order.items[index];
  if (!item || item.kind !== "image")
    throw new AppError(404, "NOT_FOUND", "Digital item not found.");
  const product = await Product.findById(item.product).select("+originalFile");
  if (!product?.originalFile)
    throw new AppError(
      404,
      "NOT_FOUND",
      "Original file has not been uploaded yet.",
    );
  try {
    await access(product.originalFile.path);
  } catch {
    throw new AppError(404, "NOT_FOUND", "File is unavailable. Contact PHULO.");
  }
  return product.originalFile;
}
