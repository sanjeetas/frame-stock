import { validateDesignImages } from "./design-image.service.js";
import type { z } from "zod";
import type { orderBody, orderQuery } from "../schemas/index.js";
import { Order, orderDto } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { AppError } from "../lib.js";
import { assertOwner } from "../middleware/authenticate.js";
export async function createOrder(
  owner: string,
  body: z.infer<typeof orderBody>,
) {
  for (const item of body.items)
    await validateDesignImages(item.customization?.design, owner);
  const products = await Product.find({
    _id: { $in: body.items.map((i) => i.productId) },
    published: true,
  });
  const items = body.items.map((i) => {
    const p = products.find((p) => String(p._id) === i.productId);
    if (!p)
      throw new AppError(
        400,
        "UNAVAILABLE_PRODUCT",
        "A selected product is unavailable.",
      );
    const selected = i.customization?.options || {};
    const config = p.customisation;
    if (config) {
      if (
        !i.customization?.design?.studio ||
        i.customization.design.artworkApproved !== true
      )
        throw new AppError(
          400,
          "ARTWORK_REQUIRED",
          "Create and approve your product artwork before ordering.",
        );
      const allowedKeys = new Set(config.options.map((option) => option.key));
      if (
        Object.keys(selected).some((key) => !allowedKeys.has(key)) ||
        config.options.some(
          (option) =>
            !selected[option.key] ||
            !option.values.includes(selected[option.key]!),
        )
      )
        throw new AppError(
          400,
          "INVALID_PRODUCT_OPTIONS",
          "Choose a valid value for every product option.",
        );
      const designOptions = i.customization?.design?.productOptions;
      if (
        !designOptions ||
        config.options.some(
          (option) => designOptions[option.key] !== selected[option.key],
        )
      )
        throw new AppError(
          400,
          "ARTWORK_OPTIONS_CHANGED",
          "Product options changed. Review the artwork again.",
        );
    } else if (Object.keys(selected).length) {
      throw new AppError(
        400,
        "INVALID_PRODUCT_OPTIONS",
        "This product does not have selectable options.",
      );
    }
    return {
      product: p._id,
      title: p.title,
      kind: p.kind,
      unit: p.unit,
      unitPrice: config?.quoteRequired ? null : p.price,
      quantity: i.quantity,
      customization: i.customization,
    };
  });
  return orderDto(
    await Order.create({
      owner,
      name: body.name,
      phone: body.phone,
      address: body.address,
      notes: body.notes,
      items,
      total: items.reduce((sum, i) => sum + (i.unitPrice ?? 0) * i.quantity, 0),
      needsQuote: items.some((i) => i.unitPrice === null),
    }),
  );
}
export async function listOrders(
  query: z.infer<typeof orderQuery>,
  owner?: string,
) {
  const filter: any = {
    ...(owner ? { owner } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.kind ? { "items.kind": query.kind } : {}),
  };
  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    Order.countDocuments(filter),
  ]);
  return {
    items: rows.map(orderDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}
export async function ownedOrder(id: string, owner: string) {
  const o = await Order.findById(id);
  if (!o) throw new AppError(404, "NOT_FOUND", "Order not found.");
  assertOwner(o.owner, owner);
  return o;
}
export async function cancelOrder(id: string, owner: string) {
  await ownedOrder(id, owner);
  const o = await Order.findOneAndUpdate(
    { _id: id, owner, status: "pending" },
    { $set: { status: "cancelled" } },
    { returnDocument: "after" },
  );
  if (!o)
    throw new AppError(
      409,
      "ORDER_LOCKED",
      "Only pending orders can be cancelled.",
    );
  return orderDto(o);
}
export async function updateOrderStatus(id: string, status: string) {
  const o = await Order.findByIdAndUpdate(
    id,
    { $set: { status } },
    { returnDocument: "after", runValidators: true },
  );
  if (!o) throw new AppError(404, "NOT_FOUND", "Order not found.");
  return orderDto(o);
}
