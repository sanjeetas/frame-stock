import mongoose from "mongoose";
import { z } from "zod";
import { parseConfig } from "../config/env.js";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/user.model.js";
import { hashPassword } from "../services/auth.service.js";
try {
  const config = parseConfig(process.env),
    input = z
      .object({
        ADMIN_NAME: z.string().min(2).max(100),
        ADMIN_EMAIL: z.email().transform((s) => s.toLowerCase()),
        ADMIN_PASSWORD: z.string().min(12).max(128),
      })
      .parse(process.env);
  await connectDatabase(config.MONGODB_URI);
  if (await User.exists({ email: input.ADMIN_EMAIL }))
    throw new Error("Existing account");
  await User.create({
    name: input.ADMIN_NAME,
    email: input.ADMIN_EMAIL,
    passwordHash: await hashPassword(input.ADMIN_PASSWORD),
    role: "admin",
  });
  console.log("Admin account created.");
} catch {
  console.error(
    "Admin creation failed. Check the admin environment variables, database, or whether the email already exists.",
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
