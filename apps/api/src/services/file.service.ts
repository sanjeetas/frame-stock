import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { bucket, storeBlob, removeBlob } from "./blob.service.js";
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
  const gridfsId = await storeBlob("originals", bytes, name, config);
  try {
    const previous = await Product.findByIdAndUpdate(
      id,
      { $set: { originalFile: { gridfsId, name }, hasFile: true } },
      { returnDocument: "before" },
    ).select("+originalFile");
    if (!previous) throw new AppError(404, "NOT_FOUND", "Product not found.");
    if (previous.originalFile?.gridfsId)
      await removeBlob("originals", previous.originalFile.gridfsId).catch(
        () => undefined,
      );
  } catch (error) {
    await removeBlob("originals", gridfsId);
    throw error;
  }
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
      // Outlined vector letters avoid relying on fonts installed in a slim container.
      const letters =
        "M12 36V66M12 36H25C40 36 40 52 25 52H12M45 36V66M66 36V66M45 51H66M78 36V54Q78 66 89 66Q100 66 100 54V36M112 36V66H132M155 36A12 15 0 1 0 155 66A12 15 0 1 0 155 36";
      const watermark = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}"><defs><pattern id="w" width="200" height="100" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)"><path d="${letters}" fill="none" stroke="#fff" stroke-width="3" opacity="0.35"/><path d="${letters}" fill="none" stroke="#16344b" stroke-width="1.6" opacity="0.4"/></pattern></defs><rect width="100%" height="100%" fill="url(#w)"/></svg>`,
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
  const name = randomBytes(16).toString("hex") + ".png";
  const gridfsId = await storeBlob("previews", output, name, config);
  const image = "/api/previews/" + name;
  try {
    const previous = await Product.findByIdAndUpdate(
      id,
      { $set: { image } },
      { returnDocument: "before" },
    );
    if (!previous) throw new AppError(404, "NOT_FOUND", "Product not found.");
    const oldName = previous.image?.match(
      /^\/api\/previews\/([a-f0-9]{32}\.png)$/,
    )?.[1];
    if (oldName) {
      const old = await bucket("previews").find({ filename: oldName }).next();
      if (old) await removeBlob("previews", old._id).catch(() => undefined);
    }
  } catch (error) {
    await removeBlob("previews", gridfsId);
    throw error;
  }
  return { image };
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
  const metadata = await bucket("originals")
    .find({ _id: product.originalFile.gridfsId })
    .next();
  if (!metadata)
    throw new AppError(404, "NOT_FOUND", "File is unavailable. Contact PHULO.");
  return product.originalFile;
}

export async function deleteOriginal(id: string) {
  const previous = await Product.findByIdAndUpdate(
    id,
    { $unset: { originalFile: 1 }, $set: { hasFile: false } },
    { returnDocument: "before" },
  ).select("+originalFile");
  if (!previous) throw new AppError(404, "NOT_FOUND", "Product not found.");
  if (previous.originalFile?.gridfsId)
    await removeBlob("originals", previous.originalFile.gridfsId);
  return { deleted: true };
}
