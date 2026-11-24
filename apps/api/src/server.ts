import { startupFailure } from "./config/startup-error.js";
import { seedImageLibrary } from "./services/library-seed.service.js";
import { bootstrapApplication, seedRequestedGiftProducts } from "./services/bootstrap.service.js";
import { User } from "./models/user.model.js";
import { Session, RefreshToken } from "./models/session.model.js";
import { Product } from "./models/product.model.js";
import { Order } from "./models/order.model.js";
import { Design } from "./models/design.model.js";
import mongoose from "mongoose";
import { parseConfig } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
let startupStage = "configuration";
async function start() {
  const config = parseConfig(process.env);
  startupStage = "database";
  await connectDatabase(config.MONGODB_URI);
  startupStage = "initialisation";
  await Promise.all([
    User.init(),
    Session.init(),
    RefreshToken.init(),
    Product.init(),
    Order.init(),
    Design.init(),
  ]);
  await bootstrapApplication(process.env);
  await seedRequestedGiftProducts();
  if (process.env.AUTO_SEED === "true") await seedImageLibrary(config);
  const app = await createApp(config);
  const server = app.listen(config.PORT, () =>
    console.log(`PHULO API listening on port ${config.PORT}`),
  );
  const stop = () =>
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0));
    });
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
start().catch((error: unknown) => {
  console.error(startupFailure(startupStage, error));
  process.exitCode = 1;
});
