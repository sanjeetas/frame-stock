import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...values: ClassValue[]) => twMerge(clsx(values));
export const money = (n: number | null) =>
  n === null
    ? "Request a quote"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(n);
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
export const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);
export function imageUrl(path: string) {
  if (path.startsWith("/api/")) return apiBase.replace(/\/api$/, "") + path;
  if (/^https:\/\//.test(path)) return path;
  return asset(path);
}
