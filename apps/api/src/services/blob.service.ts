import mongoose from "mongoose";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { StorageUsage } from "../models/storage.model.js";
import { AppError } from "../lib.js";
import type { Config } from "../config/env.js";
export type BucketName = "originals" | "previews";
export function bucket(name: BucketName) {
  const db = mongoose.connection.db;
  if (!db)
    throw new AppError(
      503,
      "DATABASE_UNAVAILABLE",
      "Storage is temporarily unavailable.",
    );
  return new mongoose.mongo.GridFSBucket(db, { bucketName: "phulo_" + name });
}
async function reserve(bytes: number, config: Config) {
  await StorageUsage.updateOne(
    { _id: "uploads" },
    { $setOnInsert: { bytes: 0 } },
    { upsert: true },
  );
  const reserved = await StorageUsage.findOneAndUpdate(
    {
      _id: "uploads",
      bytes: { $lte: config.UPLOAD_STORAGE_LIMIT_MB * 1024 * 1024 - bytes },
    },
    { $inc: { bytes } },
    { returnDocument: "after" },
  );
  if (!reserved)
    throw new AppError(
      413,
      "STORAGE_LIMIT",
      "The image library storage limit has been reached. Remove unused originals or increase the configured limit.",
    );
}
export async function storeBlob(
  name: BucketName,
  bytes: Buffer,
  filename: string,
  config: Config,
) {
  await reserve(bytes.length, config);
  const b = bucket(name),
    upload = b.openUploadStream(filename, {
      metadata: {
        contentType:
          name === "previews" ? "image/png" : "application/octet-stream",
      },
    });
  try {
    await pipeline(Readable.from(bytes), upload);
    return upload.id;
  } catch (error) {
    await upload.abort().catch(() => undefined);
    await StorageUsage.updateOne(
      { _id: "uploads" },
      { $inc: { bytes: -bytes.length } },
    );
    throw error;
  }
}
export async function removeBlob(
  name: BucketName,
  id: mongoose.mongo.ObjectId,
) {
  const b = bucket(name),
    file = await b.find({ _id: id }).next();
  if (!file) return;
  await b.delete(id);
  await StorageUsage.updateOne(
    { _id: "uploads" },
    { $inc: { bytes: -file.length } },
  );
}
export async function storageStatus(config: Config) {
  const usage = await StorageUsage.findById("uploads");
  return {
    usedBytes: usage?.bytes ?? 0,
    limitBytes: config.UPLOAD_STORAGE_LIMIT_MB * 1024 * 1024,
  };
}
