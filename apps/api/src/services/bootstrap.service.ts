import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { Product } from "../models/product.model.js";
import { User } from "../models/user.model.js";
import { productBody } from "../schemas/index.js";
import { hashPassword } from "./auth.service.js";
export async function seedCatalog() {
  const source = fileURLToPath(
    new URL("../../../../public/catalog.json", import.meta.url),
  );
  const rows = JSON.parse(await readFile(source, "utf8")) as Record<
    string,
    unknown
  >[];
  const operations = rows.map(({ id, kind, hasFile, ...candidate }) => {
    const slug = z
        .string()
        .regex(/^[\w-]{1,80}$/)
        .parse(id),
      data = productBody.parse(candidate);
    return {
      updateOne: {
        filter: { slug },
        update: {
          $setOnInsert: {
            ...data,
            slug,
            kind: data.group === "Image Library" ? "image" : "product",
            hasFile: false,
          },
        },
        upsert: true,
      },
    };
  });
  await Product.bulkWrite(operations, { ordered: false });
}
export async function bootstrapApplication(
  input: Record<string, string | undefined>,
) {
  if (input.AUTO_SEED === "true") await seedCatalog();
  if (input.BOOTSTRAP_ADMIN === "true") {
    const values = z
      .object({
        ADMIN_NAME: z.string().min(2).max(100),
        ADMIN_EMAIL: z.email().transform((v) => v.toLowerCase()),
        ADMIN_PASSWORD: z.string().min(12).max(128),
      })
      .parse(input);
    const existing = await User.findOne({ email: values.ADMIN_EMAIL });
    if (existing) {
      if (existing.role !== "admin")
        throw new Error(
          "Bootstrap email already belongs to a non-admin account.",
        );
      return;
    }
    await User.create({
      name: values.ADMIN_NAME,
      email: values.ADMIN_EMAIL,
      passwordHash: await hashPassword(values.ADMIN_PASSWORD),
      role: "admin",
    });
  }
}
