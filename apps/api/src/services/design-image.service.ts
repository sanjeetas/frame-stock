import sharp from "sharp";
import { DesignImage } from "../models/design-image.model.js";
import { Product } from "../models/product.model.js";
import { assertOwner } from "../middleware/authenticate.js";
import { AppError } from "../lib.js";
import { storeBlob, removeBlob } from "./blob.service.js";
import type { Config } from "../config/env.js";
export async function ownedImage(id: string, owner: string) {
  const image = await DesignImage.findById(id);
  if (!image) throw new AppError(404, "NOT_FOUND", "Uploaded image not found.");
  assertOwner(image.owner, owner);
  return image;
}
export async function validateDesignImages(
  settings:
    | {
        imageUploadId?: string;
        imageProductId?: string;
        baseProductId?: string;
      }
    | undefined,
  owner: string,
) {
  if (!settings) return;
  if (settings.imageUploadId) await ownedImage(settings.imageUploadId, owner);
  for (const id of [settings.imageProductId, settings.baseProductId].filter(
    Boolean,
  )) {
    if (!(await Product.exists({ _id: id, published: true })))
      throw new AppError(
        400,
        "INVALID_IMAGE",
        "Selected image or product is unavailable.",
      );
  }
}
export async function uploadDesignImage(
  owner: string,
  bytes: Buffer,
  config: Config,
) {
  if (!Buffer.isBuffer(bytes) || !bytes.length)
    throw new AppError(400, "INVALID_IMAGE", "Choose an image.");
  if ((await DesignImage.countDocuments({ owner })) >= 30)
    throw new AppError(
      413,
      "UPLOAD_LIMIT",
      "Your account image limit has been reached. Contact PHULO to remove unused images.",
    );
  let resized: Buffer;
  try {
    const image = sharp(bytes, { limitInputPixels: 25000000 });
    const meta = await image.metadata();
    if (!["png", "jpeg", "webp"].includes(meta.format || "")) throw Error();
    resized = await image
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "Choose a PNG, JPEG or WebP up to 25 megapixels.",
    );
  }
  const image = new DesignImage({ owner });
  const gridfsId = await storeBlob(
    "previews",
    resized,
    `private-${image._id}.png`,
    config,
  );
  try {
    image.gridfsId = gridfsId;
    await image.save();
  } catch (error) {
    await removeBlob("previews", gridfsId);
    throw error;
  }
  return { id: String(image._id) };
}
