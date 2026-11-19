import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { DesignSettings, Product } from "../../types";
import { asset } from "../../lib/utils";
import { Price } from "../catalog/Price";
import {
  productVariation,
  variationsForProduct,
  isCalendarProduct,
} from "./productVariations";

export function ProductVariations({
  product,
  options,
  selected,
  disabled = false,
  onSelect,
}: {
  product: Product;
  options: Record<string, string>;
  selected?: string;
  disabled?: boolean;
  onSelect: (settings: DesignSettings) => void;
}) {
  const [search, setSearch] = useState("");
  const [year, setYear] = useState(new Date().getUTCFullYear() + 1);
  const variations = useMemo(
    () =>
      variationsForProduct(product).map((t) => ({
        ...t,
        settings: productVariation(product, options, t.id, undefined, year),
      })),
    [product, options, year],
  );
  const filtered = variations.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase().trim()),
  );
  return (
    <section
      className="mx-auto max-w-6xl px-5 py-5"
      aria-label={`${product.title} design variations`}
    >
      <h2 className="text-xl font-bold">
        Choose your {product.title.toLowerCase()} design
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Select a sample first. Then replace its photo or logo, edit the text and
        move each element. These previews show blank products and editable
        placeholders.
      </p>
      <label className="my-5 flex items-center gap-3 rounded-xl border bg-white px-4">
        <Search size={21} />
        <span className="sr-only">Search design variations</span>
        <input
          type="search"
          placeholder="Search design variations"
          maxLength={100}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 py-3 outline-none"
        />
      </label>
      {isCalendarProduct(product) && (
        <label className="mb-4 block text-sm font-medium">
          Calendar year{" "}
          <select
            className="ml-3 rounded-lg border p-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from(
              { length: 6 },
              (_, i) => new Date().getUTCFullYear() + i,
            ).map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
      )}
      <p role="status" className="mb-4 text-sm">
        {filtered.length} designs
      </p>
      {!filtered.length && (
        <p className="rounded-xl bg-slate-50 p-6">
          No matching designs. Clear your search to see all variations.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {filtered.map((t) => {
          const doc = t.settings.studio!;
          const area = doc.printArea || { x: 0, y: 0, width: 1, height: 1 };
          const clip = {
            x: area.x * doc.width,
            y: area.y * doc.height,
            width: area.width * doc.width,
            height: area.height * doc.height,
          };
          const round = doc.shape === "circle" || doc.shape === "oval";
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              aria-label={`Customise ${t.name}`}
              aria-pressed={selected === t.id}
              className={`overflow-hidden rounded-2xl border bg-slate-50 text-left hover:border-cyan-500 ${selected === t.id ? "border-cyan-500" : "border-slate-200"}`}
              onClick={() => onSelect(t.settings)}
            >
              <div className="flex aspect-square items-center p-3">
                <svg
                  viewBox={`0 0 ${doc.width} ${doc.height}`}
                  role="img"
                  aria-label={`${product.title} — ${t.name} editable sample`}
                  className="w-full"
                >
                  <defs>
                    <clipPath id={`variation-${t.id}`}>
                      {round ? (
                        <ellipse
                          cx={clip.x + clip.width / 2}
                          cy={clip.y + clip.height / 2}
                          rx={clip.width / 2}
                          ry={clip.height / 2}
                        />
                      ) : (
                        <rect {...clip} rx={doc.shape === "rounded" ? 35 : 0} />
                      )}
                    </clipPath>
                  </defs>
                  {round && !doc.mockupImage ? (
                    <ellipse
                      cx={doc.width / 2}
                      cy={doc.height / 2}
                      rx={doc.width / 2}
                      ry={doc.height / 2}
                      fill={doc.pages.front.background}
                    />
                  ) : (
                    <rect
                      width={doc.width}
                      height={doc.height}
                      fill={
                        doc.mockupImage ? "#edf1f5" : doc.pages.front.background
                      }
                      rx={doc.shape === "rounded" ? 35 : 0}
                    />
                  )}
                  {doc.mockupImage && (
                    <image
                      href={asset(doc.mockupImage)}
                      width={doc.width}
                      height={doc.height}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  )}
                  <g clipPath={`url(#variation-${t.id})`}>
                    {doc.pages.front.elements.map((e) =>
                      e.type === "rect" ? (
                        <rect
                          key={e.id}
                          x={e.left - (e.width * e.scaleX) / 2}
                          y={e.top - (e.height * e.scaleY) / 2}
                          width={e.width * e.scaleX}
                          height={e.height * e.scaleY}
                          fill={e.fill}
                        />
                      ) : e.type === "circle" ? (
                        <circle
                          key={e.id}
                          cx={e.left}
                          cy={e.top}
                          r={(e.width * e.scaleX) / 2}
                          fill={e.fill}
                        />
                      ) : e.type === "text" ? (
                        <text
                          key={e.id}
                          x={
                            e.textAlign === "left"
                              ? e.left - (e.width * e.scaleX) / 2
                              : e.textAlign === "right"
                                ? e.left + (e.width * e.scaleX) / 2
                                : e.left
                          }
                          y={
                            e.top -
                            ((e.text || "").split("\n").length - 1) *
                              (e.fontSize || 20) *
                              e.scaleY *
                              0.6
                          }
                          textAnchor={
                            e.textAlign === "right"
                              ? "end"
                              : e.textAlign === "left"
                                ? "start"
                                : "middle"
                          }
                          dominantBaseline="middle"
                          fill={e.fill}
                          fontFamily={e.fontFamily}
                          fontSize={(e.fontSize || 20) * e.scaleY}
                        >
                          {(e.text || "").split("\n").map((line, index) => (
                            <tspan
                              key={index}
                              x={
                                e.textAlign === "left"
                                  ? e.left - (e.width * e.scaleX) / 2
                                  : e.textAlign === "right"
                                    ? e.left + (e.width * e.scaleX) / 2
                                    : e.left
                              }
                              dy={
                                index ? (e.fontSize || 20) * e.scaleY * 1.2 : 0
                              }
                            >
                              {line}
                            </tspan>
                          ))}
                        </text>
                      ) : null,
                    )}
                  </g>
                </svg>
              </div>
              <div className="border-t bg-white p-3">
                <p className="font-semibold">{t.name}</p>
                <p className="mt-2 text-sm">
                  <Price product={product} />
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
