import { useEffect, useState } from "react";
import { Heart, Search, SlidersHorizontal, Upload } from "lucide-react";
import {
  filterMagnetTemplates,
  isMagnetPhotoSlot,
  magnetTemplate,
  magnetTemplates,
} from "./magnetTemplate";
import { magnetFavouriteKey, parseMagnetFavourites } from "./magnetFavourites";
import { Button } from "../../components/ui/button";
import { Price } from "../catalog/Price";
import type { Product } from "../../types";

export function MagnetTemplates({
  selected,
  disabled,
  product,
  onSelect,
  onUpload,
}: {
  selected: string;
  disabled: boolean;
  product?: Product;
  onSelect: (id: string, year: number) => void;
  onUpload: () => void;
}) {
  const [photos, setPhotos] = useState("all"),
    [colour, setColour] = useState("all"),
    [style, setStyle] = useState("all");
  const [search, setSearch] = useState(""),
    [showFilters, setShowFilters] = useState(false),
    [onlyFavourites, setOnlyFavourites] = useState(false);
  const [year, setYear] = useState(new Date().getUTCFullYear() + 1);
  const [favourites, setFavourites] = useState<string[]>(() => {
    try {
      return parseMagnetFavourites(localStorage.getItem(magnetFavouriteKey));
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(magnetFavouriteKey, JSON.stringify(favourites));
    } catch {
      /* Favourites still work in this session when browser storage is unavailable. */
    }
  }, [favourites]);
  const results = filterMagnetTemplates(photos, colour, style, search).filter(
    (t) => !onlyFavourites || favourites.includes(t.id),
  );
  function clearFilters() {
    setPhotos("all");
    setColour("all");
    setStyle("all");
    setSearch("");
    setOnlyFavourites(false);
  }
  return (
    <section
      className="magnet-gallery"
      aria-label="Photo magnet design gallery"
    >
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">
              Photo magnet designs
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a design. Make every photo and word yours.
            </p>
          </div>
          <Button variant="outline" disabled={disabled} onClick={onUpload}>
            <Upload size={18} />
            Upload your own design
          </Button>
        </div>
        <div className="sticky top-0 z-10 -mx-4 flex gap-2 border-y bg-white px-4 py-3 sm:mx-0 sm:rounded-xl sm:border">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3">
            <span className="sr-only">Search templates</span>
            <input
              type="search"
              placeholder="Search templates"
              value={search}
              maxLength={100}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none"
            />
            <Search size={23} aria-hidden="true" />
          </label>
          <button
            type="button"
            aria-label="Show favourite designs"
            aria-pressed={onlyFavourites}
            className={`rounded-xl border px-3 ${onlyFavourites ? "border-pink-500 bg-pink-50 text-pink-600" : "border-slate-300 bg-white"}`}
            onClick={() => setOnlyFavourites((v) => !v)}
          >
            <Heart size={25} fill={onlyFavourites ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            aria-label="Filter templates"
            aria-expanded={showFilters}
            aria-controls="magnet-gallery-filters"
            className={`rounded-xl border px-3 ${showFilters ? "border-cyan-500 bg-cyan-50" : "border-slate-300 bg-white"}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={25} />
          </button>
        </div>
        {showFilters && (
          <div
            id="magnet-gallery-filters"
            className="mt-4 grid grid-cols-2 gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-4"
          >
            <label className="text-sm font-medium">
              Number of photos
              <select
                className="mt-1 w-full rounded-lg border bg-white p-2"
                value={photos}
                onChange={(e) => setPhotos(e.target.value)}
              >
                <option value="all">All photo counts</option>
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {n === 1 ? "photo" : "photos"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Design colour
              <select
                className="mt-1 w-full rounded-lg border bg-white p-2"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
              >
                <option value="all">All colours</option>
                {[...new Set(magnetTemplates.map((t) => t.colour))].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Style
              <select
                className="mt-1 w-full rounded-lg border bg-white p-2"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="all">All styles</option>
                {[...new Set(magnetTemplates.map((t) => t.style))].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Calendar year
              <select
                className="mt-1 w-full rounded-lg border bg-white p-2"
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
          </div>
        )}
        <div className="flex items-center justify-between py-4 text-sm">
          <p role="status">
            {results.length} {onlyFavourites ? "favourite " : ""}designs
          </p>
          <button type="button" className="underline" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
        {!results.length && (
          <div className="rounded-2xl bg-slate-50 p-8 text-center">
            <p>
              {onlyFavourites
                ? "No favourite designs match. Tap a heart to save a design."
                : "No matching designs. Try another search or clear filters."}
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              View all designs
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {results.map((t) => {
            const page = magnetTemplate(1200, 900, t.id, year),
              saved = favourites.includes(t.id);
            return (
              <article
                key={t.id}
                className={`relative overflow-hidden rounded-[26px] bg-[#f3f3f3] ${selected === t.id ? "ring-2 ring-cyan-500" : ""}`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500"
                  aria-label={`Customise ${t.name}`}
                  aria-pressed={selected === t.id}
                  onClick={() => onSelect(t.id, year)}
                >
                  <div className="flex aspect-[1/1.25] items-center px-3 pt-12 sm:px-4">
                    <svg
                      viewBox="0 0 1200 900"
                      role="img"
                      aria-label={`${t.name}: ${t.photos} photos`}
                      className="w-full drop-shadow-sm"
                    >
                      <rect
                        x="96"
                        y="72"
                        width="1008"
                        height="756"
                        rx="4"
                        fill={page.background}
                        stroke="#cccccc"
                        strokeWidth="3"
                      />
                      {page.elements.map((e) => {
                        if (e.id.startsWith("magnet-photo-label")) return null;
                        if (e.type === "rect" && isMagnetPhotoSlot(e.id))
                          return (
                            <svg
                              key={e.id}
                              x={e.left - e.width / 2}
                              y={e.top - e.height / 2}
                              width={e.width}
                              height={e.height}
                              viewBox="0 0 200 140"
                              preserveAspectRatio="none"
                            >
                              <rect width="200" height="140" fill="#d6d6d6" />
                              <g fill="white">
                                <circle cx="100" cy="36" r="15" />
                                <path d="M67 95V66Q67 50 100 50Q133 50 133 66V95Z" />
                                <circle cx="51" cy="51" r="12" />
                                <path d="M27 107V76Q27 63 51 63Q75 63 75 76V107Z" />
                                <circle cx="150" cy="54" r="11" />
                                <path d="M129 107V79Q129 65 150 65Q174 65 174 79V107Z" />
                              </g>
                              <text
                                x="100"
                                y="119"
                                textAnchor="middle"
                                fontFamily="Arial"
                                fontSize="12"
                                fill="#777"
                              >
                                Your Photo Here
                              </text>
                            </svg>
                          );
                        if (e.type === "rect")
                          return (
                            <rect
                              key={e.id}
                              x={e.left - e.width / 2}
                              y={e.top - e.height / 2}
                              width={e.width}
                              height={e.height}
                              fill={e.fill}
                            />
                          );
                        return (
                          <text
                            key={e.id}
                            x={e.left}
                            y={e.top}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontFamily={e.fontFamily}
                            fontSize={e.fontSize}
                            fill={e.fill}
                          >
                            {(e.text || "").split("\n").map((line, i) => (
                              <tspan
                                key={i}
                                x={e.left}
                                dy={i ? (e.fontSize || 20) * 1.2 : 0}
                              >
                                {line}
                              </tspan>
                            ))}
                          </text>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="px-4 pb-5 pt-3">
                    <p className="mb-3 text-sm font-medium">{t.name}</p>
                    <p className="text-base font-medium">
                      {product &&
                      (product.price !== null || product.priceDisplay) ? (
                        <Price product={product} />
                      ) : (
                        "Request quote"
                      )}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">1 unit</p>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`${saved ? "Remove" : "Save"} ${t.name} ${saved ? "from" : "to"} favourites`}
                  aria-pressed={saved}
                  className={`absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-white ${saved ? "text-pink-600" : "text-slate-900"}`}
                  onClick={() =>
                    setFavourites((ids) =>
                      ids.includes(t.id)
                        ? ids.filter((id) => id !== t.id)
                        : [...ids, t.id],
                    )
                  }
                >
                  <Heart size={24} fill={saved ? "currentColor" : "none"} />
                </button>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-slate-500">
          Original PHULO layouts. Photos replace the placeholders; all text is
          editable. Changing layouts can remove extra photo slots; Undo restores
          the previous design.
        </p>
      </div>
    </section>
  );
}
