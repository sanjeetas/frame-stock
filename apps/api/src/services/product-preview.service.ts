import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { Product } from "../models/product.model.js";
import { bucket } from "./blob.service.js";
import { AppError } from "../lib.js";

const MAX_BYTES = 8 * 1024 * 1024;
const CACHE_BYTES = 16 * 1024 * 1024;
const allowedHosts = new Set([
  "cms.cloudinary.vpsvc.com", "rlv.zcache.com", "i.etsystatic.com",
  "utmprinting.com", "cdn.shopify.com", "m.media-amazon.com", "phulo.in", "www.phulo.in",
]);
const cache = new Map<string, Buffer>();
const pending = new Map<string, Promise<Buffer>>();
let cachedBytes = 0, active = 0;
const queue: (() => void)[] = [];

/** Only stored, approved public previews are fetched, never a URL supplied in a request. */
export function validatePreviewSource(source: string) {
  let url: URL;
  try { url = new URL(source); } catch { throw new AppError(400, "INVALID_PREVIEW", "Invalid product preview."); }
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname) || url.username || url.password || (url.port && url.port !== "443"))
    throw new AppError(400, "INVALID_PREVIEW", "Upload this product preview through the admin panel.");
  return url;
}
async function readLimited(body: AsyncIterable<Uint8Array>) {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new AppError(413, "PREVIEW_TOO_LARGE", "Product preview exceeds the image size limit.");
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
async function remotePreview(source: string) {
  let url = validatePreviewSource(source);
  const signal = AbortSignal.timeout(12000);
  for (let redirects = 0; redirects < 4; redirects++) {
    const response = await fetch(url, {
      redirect: "manual", signal,
      headers: { Accept: "image/png,image/jpeg,image/webp,image/avif", "User-Agent": "PHULO-Product-Preview/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) break;
      url = validatePreviewSource(new URL(location, url).href);
      continue;
    }
    if (!response.ok || !response.body) { await response.body?.cancel(); break; }
    if (Number(response.headers.get("content-length")) > MAX_BYTES) {
      await response.body.cancel();
      throw new AppError(413, "PREVIEW_TOO_LARGE", "Product preview exceeds the image size limit.");
    }
    return readLimited(response.body);
  }
  throw new AppError(502, "PREVIEW_UNAVAILABLE", "Product preview could not be loaded. Try again or contact PHULO.");
}
async function sourceBytes(source: string) {
  if (/^assets\/[\w.-]+\.(png|jpe?g|webp|svg)$/i.test(source)) {
    // Production serves Vite's public assets; development/test can use the source assets.
    try { return await readFile(new URL("../../../web/dist/" + source, import.meta.url)); }
    catch { return readFile(new URL("../../../../public/" + source, import.meta.url)); }
  }
  const publicFile = source.match(/^\/api\/previews\/([a-f\d]{32}\.png)$/i)?.[1];
  if (publicFile) {
    const b = bucket("previews"), file = await b.find({ filename: publicFile }).next();
    if (!file) throw new AppError(404, "NOT_FOUND", "Product preview not found.");
    if (file.length > MAX_BYTES) throw new AppError(413, "PREVIEW_TOO_LARGE", "Product preview exceeds the image size limit.");
    return readLimited(b.openDownloadStream(file._id));
  }
  return remotePreview(source);
}
async function rasterPreview(source: string) {
  if (active >= 2) {
    if (queue.length >= 20) throw new AppError(503, "PREVIEW_BUSY", "Preview service is busy. Please try again.");
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  else active++;
  try {
    const bytes = await sourceBytes(source);
    if (bytes.length > MAX_BYTES) throw new AppError(413, "PREVIEW_TOO_LARGE", "Product preview exceeds the image size limit.");
    const image = sharp(bytes, { limitInputPixels: 16000000 });
    const info = await image.metadata();
    if (!["jpeg", "png", "webp", "svg", "avif", "heif"].includes(info.format || ""))
      throw new AppError(400, "INVALID_PREVIEW", "Product preview is not a supported image.");
    return await image.rotate().resize(1400, 1400, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  } finally { const next = queue.shift(); if (next) next(); else active--; }
}
export async function productPreview(id: string) {
  // Availability is checked on every request, even for a cached public preview.
  const product = await Product.findOne({ _id: id, published: true }).select("image updatedAt");
  if (!product?.image) throw new AppError(404, "NOT_FOUND", "Product preview not found.");
  const key = `${product._id}:${product.updatedAt.getTime()}:${product.image}`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  if (pending.has(key)) return pending.get(key)!;
  const loading = rasterPreview(product.image).then((bytes) => {
    while (cache.size && (cache.size >= 12 || cachedBytes + bytes.length > CACHE_BYTES)) {
      const first = cache.keys().next().value!;
      cachedBytes -= cache.get(first)!.length; cache.delete(first);
    }
    if (bytes.length <= CACHE_BYTES) { cache.set(key, bytes); cachedBytes += bytes.length; }
    return bytes;
  }).catch((error: unknown) => {
    if (error instanceof AppError) throw error;
    throw new AppError(502, "PREVIEW_UNAVAILABLE", "Product preview could not be loaded. Try again or contact PHULO.");
  }).finally(() => pending.delete(key));
  pending.set(key, loading);
  return loading;
}
