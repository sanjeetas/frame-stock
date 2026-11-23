import mongoose from "mongoose";
import { parseConfig } from "../config/env.js";
import { connectDatabase } from "../config/database.js";
import { startupFailure } from "../config/startup-error.js";
import { productQuery } from "../schemas/index.js";

async function doctor() {
  let stage: "configuration" | "catalogue" | "database" | "products" = "configuration";
  try {
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 24) {
      console.error("FAIL: Node.js 24 or newer is required. Update Node, reopen VS Code, then retry.");
      process.exitCode = 1;
      return;
    }
    console.log(`OK: Node.js ${process.versions.node}`);
    const config = parseConfig(process.env);
    console.log("OK: Required environment fields are valid. Secret values are not printed.");

    // Disable automatic collection/index creation before importing any models.
    // This standalone diagnostic must never initialise or change database data.
    mongoose.set("autoCreate", false);
    mongoose.set("autoIndex", false);
    const { listCategories, listProducts } = await import("../services/product.service.js");
    stage = "catalogue";
    const categories = await listCategories();
    if (!Array.isArray(categories) || !categories.length) throw new Error("Invalid catalogue");
    console.log("OK: Local category catalogue is readable.");

    stage = "database";
    await connectDatabase(config.MONGODB_URI);
    console.log("OK: MongoDB connection established from this computer.");
    stage = "products";
    const result = await listProducts(productQuery.parse({ page: 1, limit: 1, sort: "featured" }));
    console.log("OK: The actual product-list query and response conversion succeeded.");
    console.log(result.items.length
      ? "OK: Published products are available in the configured database."
      : "NOTE: No published products in this database. Check the database name in MONGODB_URI before seeding anything.");
    console.log("NEXT: Stop old dev terminals with Ctrl+C, run npm run dev from the project root, and open http://localhost:5173.");
  } catch (error: unknown) {
    process.exitCode = 1;
    if (stage === "configuration" || stage === "database") {
      console.error(startupFailure(stage, error));
    } else if (stage === "catalogue") {
      console.error("FAIL: The local category catalogue is missing or invalid. Pull the latest repository files and retry from the project root.");
    } else {
      console.error("FAIL: MongoDB connected, but the product query failed. Check database-user read permissions, stored product data and your running API version.");
      const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
      if (typeof code === "number" && Number.isSafeInteger(code)) console.error(`MongoDB error code: ${code}`);
    }
    console.error("No passwords, connection strings or raw database errors are included in this report.");
  } finally {
    await mongoose.disconnect().catch(() => { process.exitCode = 1; });
  }
}
void doctor();
