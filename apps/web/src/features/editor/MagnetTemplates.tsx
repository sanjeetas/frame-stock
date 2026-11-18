import { useState } from "react";
import {
  filterMagnetTemplates,
  magnetTemplate,
  magnetTemplates,
} from "./magnetTemplate";
import { Button } from "../../components/ui/button";

export function MagnetTemplates({
  selected,
  disabled,
  onSelect,
  onUpload,
}: {
  selected: string;
  disabled: boolean;
  onSelect: (id: string) => void;
  onUpload: () => void;
}) {
  const [photos, setPhotos] = useState("all"),
    [colour, setColour] = useState("all"),
    [style, setStyle] = useState("all");
  const results = filterMagnetTemplates(photos, colour, style);
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Choose a single-magnet design, then replace each photo and edit its
        text. These are original PHULO layouts.
      </p>
      <Button
        className="w-full"
        variant="outline"
        disabled={disabled}
        onClick={onUpload}
      >
        Upload your own design
      </Button>
      <div className="space-y-3">
        <label className="block text-sm font-medium">
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
        <label className="block text-sm font-medium">
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
        <label className="block text-sm font-medium">
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
      </div>
      <div className="flex items-center justify-between text-sm">
        <p role="status">{results.length} designs</p>
        <button
          type="button"
          className="underline"
          onClick={() => {
            setPhotos("all");
            setColour("all");
            setStyle("all");
          }}
        >
          Clear filters
        </button>
      </div>
      {!results.length && (
        <p className="rounded-lg bg-slate-50 p-4 text-sm">
          No designs match these filters. Try another colour or clear filters.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {results.map((t) => {
          const page = magnetTemplate(1000, 1000, t.id);
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected === t.id}
              className={`overflow-hidden rounded-xl border-2 text-left ${selected === t.id ? "border-cyan-500" : "border-slate-200 hover:border-cyan-400"}`}
              onClick={() => onSelect(t.id)}
            >
              <svg
                viewBox="0 0 1000 1000"
                role="img"
                aria-label={`${t.name}: ${t.photos} photos`}
                className="w-full"
              >
                <rect width="1000" height="1000" fill="#edf1f5" />
                <rect
                  x="80"
                  y="80"
                  width="840"
                  height="840"
                  rx="35"
                  fill={page.background}
                />
                {page.elements.map((e) =>
                  e.type === "rect" ? (
                    <rect
                      key={e.id}
                      x={e.left - e.width / 2}
                      y={e.top - e.height / 2}
                      width={e.width}
                      height={e.height}
                      fill={e.fill}
                    />
                  ) : (
                    <text
                      key={e.id}
                      x={e.left}
                      y={e.top + 12}
                      textAnchor="middle"
                      fontSize={e.fontSize}
                      fill={e.fill}
                      fontFamily={e.fontFamily}
                    >
                      {e.text}
                    </text>
                  ),
                )}
              </svg>
              <span className="block p-2 text-sm font-semibold">{t.name}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Changing layouts moves existing photos into the new slots. Undo restores
        your previous layout.
      </p>
    </div>
  );
}
