import { randomBytes } from "node:crypto";
import type { z } from "zod";
import { Product, productDto } from "../models/product.model.js";
import { AppError } from "../lib.js";
import type { productQuery, productBody } from "../schemas/index.js";
export async function listProducts(
  query: z.infer<typeof productQuery>,
  admin = false,
) {
  const filter: Record<string, unknown> = admin ? {} : { published: true };
  if (query.group) filter.group = query.group;
  if (query.category) filter.category = query.category;
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
    featured: { createdAt: -1, _id: 1 },
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
  const data = {
    ...body,
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
