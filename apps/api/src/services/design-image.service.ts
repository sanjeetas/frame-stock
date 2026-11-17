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
        studio?: {
          pages: {
            front: { elements: { uploadId?: string; productId?: string }[] };
            back: { elements: { uploadId?: string; productId?: string }[] };
          };
        };
      }
    | undefined,
  owner: string,
) {
  if (!settings) return;
  const elements = settings.studio
    ? [
        ...settings.studio.pages.front.elements,
        ...settings.studio.pages.back.elements,
      ]
    : [];
  const uploads = new Set(
    [
      settings.imageUploadId,
      ...elements.map((element) => element.uploadId),
    ].filter((value): value is string => !!value),
  );
  for (const upload of uploads) await ownedImage(upload, owner);
  const productIds = new Set(
    [
      settings.imageProductId,
      settings.baseProductId,
      ...elements.map((element) => element.productId),
    ].filter((value): value is string => !!value),
  );
  if (
    productIds.size &&
    (await Product.countDocuments({
      _id: { $in: [...productIds] },
      published: true,
    })) !== productIds.size
  )
    throw new AppError(
      400,
      "INVALID_IMAGE",
      "Selected image or product is unavailable.",
    );
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
