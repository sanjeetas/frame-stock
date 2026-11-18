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
  // Apply this requested source snapshot once; later admin edits survive restarts.
  await Product.bulkWrite(
    rows.map(({ id, kind, hasFile, ...candidate }) => ({
      updateOne: {
        filter: {
          slug: z.string().parse(id),
          sourceVersion: { $ne: "phulo-source-v1" },
        },
        update: {
          $set: {
            ...productBody.parse(candidate),
            sourceVersion: "phulo-source-v1",
          },
        },
      },
    })),
    { ordered: false },
  );
  await applyCatalogImageCorrections();
  await seedCustomProducts();
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

export async function applyCatalogImageCorrections() {
  const source = fileURLToPath(
    new URL(
      "../../../../public/catalog-image-corrections.json",
      import.meta.url,
    ),
  );
  const localImage = z.string().regex(/^assets\/[\w.-]+$/);
  const corrections = z
    .array(
      z
        .object({
          slug: z.string().regex(/^[\w-]{1,80}$/),
          previousImage: localImage,
          image: localImage,
        })
        .strict(),
    )
    .parse(JSON.parse(await readFile(source, "utf8")));
  // Only replace known old placeholders; preserve admin uploads and custom image URLs.
  await Product.bulkWrite(
    corrections.map((row) => ({
      updateOne: {
        filter: { slug: row.slug, image: row.previousImage },
        update: { $set: { image: row.image } },
      },
    })),
    { ordered: false },
  );
}

// Additive seed: source categories/prices, admin edits and hidden products survive restarts.
export async function seedCustomProducts() {
  const input = JSON.parse(
    await readFile(
      new URL("../../../../public/custom-products.json", import.meta.url),
      "utf8",
    ),
  );
  const catalog = z
    .object({
      products: z.array(
        productBody.extend({ id: z.string().regex(/^[\w-]{1,80}$/) }),
      ),
      links: z.record(z.string(), productBody.shape.customisation.unwrap()),
    })
    .parse(input);
  await Product.bulkWrite(
    catalog.products.map(({ id: slug, ...data }) => ({
      updateOne: {
        filter: { slug },
        update: {
          $setOnInsert: { ...data, slug, kind: "product", hasFile: false },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  await Product.bulkWrite(
    Object.entries(catalog.links).map(([slug, customisation]) => ({
      updateOne: {
        filter: { slug, customisation: { $exists: false } },
        update: { $set: { customisation, editable: true } },
      },
    })),
    { ordered: false },
  );
}
