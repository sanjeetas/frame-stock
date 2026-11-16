import mongoose from "mongoose";
import { parseConfig } from "../config/env.js";
import { connectDatabase } from "../config/database.js";
import { seedCatalog } from "../services/bootstrap.service.js";
try {
  const config = parseConfig(process.env);
  await connectDatabase(config.MONGODB_URI);
  await seedCatalog();
  console.log("Catalog seed complete. Existing entries were preserved.");
} catch {
  console.error("Seed failed. Check configuration and MongoDB connectivity.");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
