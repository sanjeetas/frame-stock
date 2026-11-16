import type { z } from "zod";
import type { designBody, pagination } from "../schemas/index.js";
import { Design, designDto } from "../models/design.model.js";
import { AppError } from "../lib.js";
import { assertOwner } from "../middleware/authenticate.js";
export async function ownedDesign(id: string, owner: string) {
  const d = await Design.findById(id);
  if (!d) throw new AppError(404, "NOT_FOUND", "Design not found.");
  assertOwner(d.owner, owner);
  return d;
}
export async function createDesign(
  owner: string,
  body: z.infer<typeof designBody>,
) {
  return designDto(await Design.create({ owner, ...body }));
}
export async function listDesigns(
  owner: string,
  query: z.infer<typeof pagination>,
) {
  const filter = { owner },
    [rows, total] = await Promise.all([
      Design.find(filter)
        .sort({ updatedAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit),
      Design.countDocuments(filter),
    ]);
  return {
    items: rows.map(designDto),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}
export async function updateDesign(
  id: string,
  owner: string,
  body: z.infer<typeof designBody>,
) {
  const d = await ownedDesign(id, owner);
  d.title = body.title;
  d.settings = body.settings;
  await d.save();
  return designDto(d);
}
export async function deleteDesign(id: string, owner: string) {
  await ownedDesign(id, owner);
  await Design.deleteOne({ _id: id, owner });
  return { deleted: true };
}
