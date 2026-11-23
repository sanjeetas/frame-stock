import type { Product } from "../../types";
import { productColours } from "./productColours";

export function ProductOptions({
  product,
  options,
  onChange,
  disabled = false,
}: {
  product: Product;
  options: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  disabled?: boolean;
}) {
  const fields =
    product.customisation?.options.filter(
      (o) => o.key === "size" || o.key === "colour" || (product.customisation?.family === "Magnets" && ["orientation", "shape"].includes(o.key)),
    ) || [];
  if (!fields.length) return null;
  function update(key: string, value: string) {
    const next = { ...options, [key]: value };
    if (product.customisation?.family === "Magnets" && key === "shape" && ["Circle", "Custom shape"].includes(value)) next.orientation = "Square";
    onChange(next);
  }
  return (
    <div
      className="my-4 space-y-4 rounded-2xl border border-cyan-100 bg-white p-4"
      aria-label="Product size and colour"
    >
      {fields.map((field) =>
        field.key === "colour" ? (
          <fieldset key={field.key} disabled={disabled}>
            <legend className="mb-2 text-sm font-semibold">
              {field.label}: {options[field.key] || "Choose colour"}
            </legend>
            <div className="flex flex-wrap gap-2">
              {field.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled}
                  aria-label={`Product colour ${value}`}
                  aria-pressed={options[field.key] === value}
                  onClick={() => onChange({ ...options, [field.key]: value })}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm ${options[field.key] === value ? "border-cyan-600 bg-cyan-50 ring-1 ring-cyan-600" : "border-slate-200"}`}
                >
                  {productColours[value] && (
                    <span
                      className="size-5 rounded-full border border-slate-300"
                      style={{ backgroundColor: productColours[value] }}
                    />
                  )}
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
        ) : (
          <label key={field.key} className="block text-sm font-semibold">
            {field.label}
            <select
              aria-label={`Product ${field.key}`}
              className="mt-2 min-h-10 w-full rounded-lg border bg-white p-2"
              disabled={disabled || (product.customisation?.family === "Magnets" && field.key === "orientation" && ["Circle", "Custom shape"].includes(options.shape || ""))}
              value={options[field.key] || field.values[0]}
              onChange={(e) =>
                update(field.key, e.target.value)
              }
            >
              {field.values.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ),
      )}
    </div>
  );
}
