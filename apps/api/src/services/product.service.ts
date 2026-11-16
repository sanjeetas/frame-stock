import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import type { z } from "zod";
import { Product, productDto } from "../models/product.model.js";
import { AppError } from "../lib.js";
import type { productQuery, productBody } from "../schemas/index.js";
export async function listCategories() {
  return JSON.parse(
    await readFile(
      new URL("../../../../public/categories.json", import.meta.url),
      "utf8",
    ),
  ) as {
    id: number;
    parent: number;
    name: string;
    slug: string;
    count: number;
  }[];
}
export async function listProducts(
  query: z.infer<typeof productQuery>,
  admin = false,
) {
  const filter: Record<string, unknown> = admin ? {} : { published: true };
  if (query.group) filter.group = query.group;
  if (query.category) filter.category = query.category;
  if (query.categoryId) {
    const categories = await listCategories();
    const ids = new Set([query.categoryId]);
    // Descendants are bounded by the imported taxonomy; keep parent queries inclusive.
    for (let i = 0; i < categories.length; i++)
      for (const category of categories)
        if (ids.has(category.parent)) ids.add(category.id);
    filter.categoryIds = { $in: [...ids] };
  }
  if (query.search) {
    const escaped = Array.from(query.search)
      .map((char) => ("\\^$.*+?()[]{}|".includes(char) ? "\\" + char : char))
      .join("");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { category: { $regex: escaped, $options: "i" } },
    ];
  }
  const sorts = {
    featured: { sourceOrder: 1, _id: 1 },
    low: { price: 1, _id: 1 },
    high: { price: -1, _id: 1 },
    az: { title: 1, _id: 1 },
  } as const;
  const [rows, total] = await Promise.all([
    Product.find(filter)
      .sort(sorts[query.sort])
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Product.countDocuments(filter),
  ]);
  return {
    items: rows.map(productDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}
export async function getProduct(id: string, admin = false) {
  const p = await Product.findOne({
    _id: id,
    ...(!admin ? { published: true } : {}),
  });
  if (!p) throw new AppError(404, "NOT_FOUND", "Product not found.");
  return productDto(p);
}
export async function saveProduct(
  body: z.infer<typeof productBody>,
  id?: string,
) {
  const existing = id ? await Product.findById(id) : null;
  if (id && !existing)
    throw new AppError(404, "NOT_FOUND", "Product not found.");
  const taxonomy = await listCategories();
  const data = {
    ...body,
    // Clear source formatting only when an admin actually changes the numeric price.
    priceDisplay:
      body.priceDisplay ??
      (existing?.price === body.price ? existing.priceDisplay : ""),
    categoryIds:
      body.categoryIds ??
      (existing?.category === body.category
        ? existing.categoryIds
        : taxonomy
            .filter((category) => category.name === body.category)
            .map((category) => category.id)),
    kind:
      body.group === "Image Library"
        ? ("image" as const)
        : ("product" as const),
  };
  const p = id
    ? await Product.findByIdAndUpdate(
        id,
        { $set: data },
        { returnDocument: "after", runValidators: true },
      )
    : await Product.create({ ...data, slug: randomBytes(10).toString("hex") });
  if (!p) throw new AppError(404, "NOT_FOUND", "Product not found.");
  return productDto(p);
}
export async function hideProduct(id: string) {
  const p = await Product.findByIdAndUpdate(
    id,
    { $set: { published: false } },
    { returnDocument: "after", runValidators: true },
  );
  if (!p) throw new AppError(404, "NOT_FOUND", "Product not found.");
  return productDto(p);
}
