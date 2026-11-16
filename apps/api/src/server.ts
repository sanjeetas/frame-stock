import { User } from "./models/user.model.js";
import { Session, RefreshToken } from "./models/session.model.js";
import { Product } from "./models/product.model.js";
import { Order } from "./models/order.model.js";
import { Design } from "./models/design.model.js";
import mongoose from "mongoose";
import { parseConfig } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
async function start() {
  const config = parseConfig(process.env);
  await connectDatabase(config.MONGODB_URI);
  await Promise.all([
    User.init(),
    Session.init(),
    RefreshToken.init(),
    Product.init(),
    Order.init(),
    Design.init(),
  ]);
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
start().catch(() => {
  console.error(
    "Startup failed. Check environment configuration and MongoDB connectivity.",
  );
  process.exitCode = 1;
});
