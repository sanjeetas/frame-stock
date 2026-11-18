import { magnetTemplates } from "./magnetTemplate";
export const magnetFavouriteKey = "phulo-magnet-favourites-v1";
export function parseMagnetFavourites(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(value)) return [];
    const valid = new Set<string>(magnetTemplates.map((t) => t.id));
    return [
      ...new Set(
        value.filter(
          (id): id is string => typeof id === "string" && valid.has(id),
        ),
      ),
    ];
  } catch {
    return [];
  }
}
