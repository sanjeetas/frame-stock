import mongoose from "mongoose";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseConfig } from "../config/env.js";
import { connectDatabase } from "../config/database.js";
import { Product } from "../models/product.model.js";
try {
  const config = parseConfig(process.env);
  await connectDatabase(config.MONGODB_URI);
  const source = fileURLToPath(
    new URL("../../../../public/catalog.json", import.meta.url),
  );
  const catalog = JSON.parse(await readFile(source, "utf8"));
  for (const row of catalog) {
    const { id, hasFile, ...data } = row;
    await Product.updateOne(
      { slug: id },
      { $setOnInsert: { ...data, slug: id, hasFile: false } },
      { upsert: true, runValidators: true },
    );
  }
  console.log("Catalog seed complete. Existing entries were preserved.");
} catch {
  console.error("Seed failed. Check configuration and MongoDB connectivity.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
