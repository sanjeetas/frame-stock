import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import type { StudioElement } from "./studioTypes";
const fullCrop = { x: 0, y: 0, width: 1, height: 1 };
export function StudioMorePanel({
  selected,
  onCrop,
  onFlip,
  onAlign,
  onShadow,
  onSpacing,
  onCopy,
  onPaste,
  canPaste,
  onZoomFit,
  onClear,
}: {
  selected: StudioElement | null;
  onCrop: (crop: NonNullable<StudioElement["crop"]>) => void;
  onFlip: (axis: "x" | "y") => void;
  onAlign: (value: "left" | "right" | "top" | "bottom" | "center") => void;
  onShadow: (enabled: boolean, blur?: number) => void;
  onSpacing: (value: number) => void;
  onCopy: () => void;
  onPaste: () => void;
  canPaste: boolean;
  onZoomFit: () => void;
  onClear: () => void;
}) {
  const [crop, setCrop] = useState(selected?.crop || fullCrop),
    [clearConfirm, setClearConfirm] = useState(false);
  useEffect(() => {
    setCrop(selected?.crop || fullCrop);
    setClearConfirm(false);
  }, [selected?.id, selected?.crop]);
  return (
    <div className="space-y-5">
      <p className="text-xs leading-5 text-slate-500">
        Select an element on the canvas to use its tools. Keyboard arrows nudge;
        Shift moves faster. Ctrl/Cmd+C, V and D copy, paste and duplicate
        layers.
      </p>
      {selected && (
        <>
          <h3 className="font-semibold">Align element</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["left", "right", "top", "bottom", "center"] as const).map(
              (value) => (
                <Button
                  key={value}
                  size="sm"
                  variant="outline"
                  onClick={() => onAlign(value)}
                >
                  {value[0]!.toUpperCase() + value.slice(1)}
                </Button>
              ),
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => onFlip("x")}>
              Flip horizontal
            </Button>
            <Button variant="outline" size="sm" onClick={() => onFlip("y")}>
              Flip vertical
            </Button>
          </div>
          <Button size="sm" variant="outline" onClick={onCopy}>
            Copy layer
          </Button>
          {selected.type === "text" && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold">Text effects</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!selected.shadow}
                  onChange={(event) => onShadow(event.target.checked)}
                />
                Text shadow
              </label>
              {selected.shadow && (
                <label className="block text-sm">
                  Shadow blur
                  <input
                    aria-label="Shadow blur"
                    type="range"
                    className="mt-2 w-full"
                    min={0}
                    max={50}
                    value={selected.shadow.blur}
                    onChange={(event) =>
                      onShadow(true, Number(event.target.value))
                    }
                  />
                </label>
              )}
              <label className="block text-sm">
                Letter spacing
                <input
                  aria-label="Letter spacing"
                  className="mt-2 w-full"
                  type="range"
                  min={-100}
                  max={600}
                  value={selected.charSpacing || 0}
                  onChange={(event) => onSpacing(Number(event.target.value))}
                />
              </label>
            </div>
          )}
          {selected.type === "image" && (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold">Crop image</h3>
              {(["x", "y", "width", "height"] as const).map((key) => (
                <label key={key} className="block text-sm capitalize">
                  {key === "x" ? "Left" : key === "y" ? "Top" : key}:{" "}
                  {Math.round(crop[key] * 100)}%
                  <input
                    aria-label={`Crop ${key}`}
                    className="mt-1 w-full"
                    type="range"
                    min={key === "width" || key === "height" ? 10 : 0}
                    max={key === "x" || key === "y" ? 90 : 100}
                    value={Math.round(crop[key] * 100)}
                    onChange={(event) => {
                      const next = {
                        ...crop,
                        [key]: Number(event.target.value) / 100,
                      };
                      if (key === "x")
                        next.width = Math.min(next.width, 1 - next.x);
                      if (key === "y")
                        next.height = Math.min(next.height, 1 - next.y);
                      if (key === "width")
                        next.x = Math.min(next.x, 1 - next.width);
                      if (key === "height")
                        next.y = Math.min(next.y, 1 - next.height);
                      setCrop(next);
                    }}
                  />
                </label>
              ))}
              <Button size="sm" onClick={() => onCrop(crop)}>
                Apply crop
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCrop(fullCrop);
                  onCrop(fullCrop);
                }}
              >
                Reset crop
              </Button>
            </div>
          )}
        </>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={!canPaste}
        onClick={onPaste}
      >
        Paste layer
      </Button>
      <hr className="border-slate-200" />
      <Button variant="outline" className="w-full" onClick={onZoomFit}>
        Fit artwork to screen
      </Button>
      {clearConfirm ? (
        <div className="rounded-xl bg-red-50 p-4 text-sm">
          <p>Clear this side? Undo can restore it.</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                onClear();
                setClearConfirm(false);
              }}
            >
              Clear side
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setClearConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setClearConfirm(true)}
        >
          Clear current side
        </Button>
      )}
    </div>
  );
}
