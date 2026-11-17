import { useEffect, useRef, useState, useCallback } from "react";
import { Download, Save, Move, AlignCenter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Field } from "../../components/Field";
import { useAuth } from "../auth/AuthProvider";
import {
  layerPosition,
  positionPatch,
  type DesignLayer,
} from "./editorGeometry";
import { ProofCanvas } from "./ProofCanvas";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { Product } from "../../types";
import { api } from "../../lib/api";
import type { Design, DesignSettings } from "../../types";
export const initialDesign: DesignSettings = {
  headline: "Your brand. Your story.",
  subtitle: "Thoughtfully made, just for you.",
  bg: "#e7ecd9",
  fg: "#0c3459",
  font: "Georgia",
  size: 62,
  y: 580,
  square: false,
  hasUploadedImage: false,
};
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: DesignSettings;
  existingId?: string;
  onApply?: (settings: DesignSettings) => void;
  onSaved?: () => void;
  onSignIn: () => void;
}
export function DesignEditor({
  open,
  onOpenChange,
  initial,
  existingId,
  onApply,
  onSaved,
  onSignIn,
}: Props) {
  const [selectedLayer, setSelectedLayer] = useState<DesignLayer>("headline");
  const headlineInput = useRef<HTMLInputElement>(null),
    subtitleInput = useRef<HTMLInputElement>(null);
  const { user } = useAuth(),
    canvas = useRef<HTMLCanvasElement>(null);
  const [values, setValues] = useState<DesignSettings>(
      initial || initialDesign,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [savedId, setSavedId] = useState(existingId);
  useEffect(() => {
    if (open) {
      canvas.current = null;
      setCanExport(false);
      setValues(initial || initialDesign);
      setSelectedLayer("headline");
      setError("");
      setSuccess("");
      setSavedId(existingId);
    }
  }, [open, initial, existingId]);
  const library = useApiQuery<Product[]>(open ? "/library?limit=100" : null);
  const [uploading, setUploading] = useState(false);
  const [canExport, setCanExport] = useState(false);
  const acceptCanvas = useCallback((value: HTMLCanvasElement | null) => {
    canvas.current = value;
    setCanExport(!!value);
  }, []);
  const changePosition = useCallback((patch: Partial<DesignSettings>) => {
    setValues((value) => ({ ...value, ...patch }));
    setSuccess("");
  }, []);
  const position = layerPosition(values, selectedLayer);
  const hasImage = !!(values.imageUploadId || values.imageProductId);
  function editText(layer: DesignLayer) {
    setSelectedLayer(layer);
    const input =
      layer === "headline"
        ? headlineInput.current
        : layer === "subtitle"
          ? subtitleInput.current
          : null;
    input?.focus();
    input?.select();
  }
  function update<K extends keyof DesignSettings>(
    key: K,
    value: DesignSettings[K],
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setSuccess("");
  }
  async function save() {
    if (!user) {
      onSignIn();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api<Design>(
        savedId ? "/designs/" + savedId : "/designs",
        {
          method: savedId ? "PATCH" : "POST",
          body: {
            title: values.headline || "Untitled design",
            settings: values,
          },
        },
      );
      setSavedId(res.data.id);
      setSuccess("Design saved to your account.");
      onSaved?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportPng() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "phulo-customised-preview.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogTitle className="text-2xl font-bold">
          Make it your own.
        </DialogTitle>
        <DialogDescription className="my-2 text-sm text-slate-500">
          Select text or an image on the product and drag it into place.
          Double-click text to edit it.
        </DialogDescription>
        <div className="mt-6 grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="self-start rounded-xl bg-slate-100 p-4 md:sticky md:top-0">
            <div
              className="mb-3 flex flex-wrap gap-2"
              aria-label="Select design element"
            >
              {(["headline", "subtitle", "image"] as DesignLayer[]).map(
                (layer) => (
                  <Button
                    key={layer}
                    size="sm"
                    variant={selectedLayer === layer ? "default" : "outline"}
                    aria-pressed={selectedLayer === layer}
                    disabled={layer === "image" && !hasImage}
                    onClick={() => setSelectedLayer(layer)}
                  >
                    {layer === "headline"
                      ? "Headline"
                      : layer === "subtitle"
                        ? "Supporting text"
                        : "Image"}
                  </Button>
                ),
              )}
            </div>
            <ProofCanvas
              settings={values}
              onCanvas={acceptCanvas}
              selectedLayer={selectedLayer}
              onSelectLayer={setSelectedLayer}
              onChange={changePosition}
              onEditText={editText}
            />
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <Move size={18} />
              Drag the selected element. Arrow keys move it precisely; Shift
              moves faster.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  changePosition(
                    positionPatch(selectedLayer, { ...position, x: 50 }),
                  )
                }
              >
                <AlignCenter size={18} />
                Center selected
              </Button>
              {selectedLayer !== "image" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => editText(selectedLayer)}
                >
                  Edit selected text
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  changePosition({
                    textX: undefined,
                    textY: undefined,
                    subtitleX: undefined,
                    subtitleY: undefined,
                    imageX: undefined,
                    imageY: undefined,
                    imageScale: 100,
                  })
                }
              >
                Reset positions
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Headline">
              {(id) => (
                <Input
                  id={id}
                  ref={headlineInput}
                  onFocus={() => setSelectedLayer("headline")}
                  value={values.headline}
                  maxLength={90}
                  onChange={(e) => update("headline", e.target.value)}
                />
              )}
            </Field>
            <Field label="Supporting text">
              {(id) => (
                <Input
                  id={id}
                  ref={subtitleInput}
                  onFocus={() => setSelectedLayer("subtitle")}
                  value={values.subtitle}
                  maxLength={140}
                  onChange={(e) => update("subtitle", e.target.value)}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Background">
                {(id) => (
                  <input
                    id={id}
                    type="color"
                    value={values.bg}
                    onChange={(e) => update("bg", e.target.value)}
                  />
                )}
              </Field>
              <Field label="Text colour">
                {(id) => (
                  <input
                    id={id}
                    type="color"
                    value={values.fg}
                    onChange={(e) => update("fg", e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field label="Font">
              {(id) => (
                <select
                  id={id}
                  value={values.font}
                  onChange={(e) =>
                    update("font", e.target.value as DesignSettings["font"])
                  }
                >
                  <option>Georgia</option>
                  <option>Arial</option>
                  <option>monospace</option>
                </select>
              )}
            </Field>
            {selectedLayer === "image" ? (
              <Field label={`Image size: ${values.imageScale ?? 100}%`}>
                {(id) => (
                  <input
                    id={id}
                    type="range"
                    className="w-full accent-primary"
                    min={10}
                    max={250}
                    value={values.imageScale ?? 100}
                    onChange={(event) =>
                      update("imageScale", Number(event.target.value))
                    }
                  />
                )}
              </Field>
            ) : (
              <Field
                label={
                  selectedLayer === "headline"
                    ? "Headline size"
                    : "Supporting text size"
                }
              >
                {(id) => (
                  <input
                    id={id}
                    type="range"
                    className="w-full accent-primary"
                    min={12}
                    max={selectedLayer === "headline" ? 160 : 100}
                    value={
                      selectedLayer === "headline"
                        ? values.size
                        : (values.subtitleSize ?? 24)
                    }
                    onChange={(event) =>
                      update(
                        selectedLayer === "headline" ? "size" : "subtitleSize",
                        Number(event.target.value),
                      )
                    }
                  />
                )}
              </Field>
            )}
            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-4 space-y-3">
              <h3 className="font-semibold">
                {selectedLayer === "image"
                  ? "Image"
                  : selectedLayer === "headline"
                    ? "Headline"
                    : "Supporting text"}{" "}
                position
              </h3>
              {(["x", "y"] as const).map((axis) => (
                <Field
                  key={axis}
                  label={`${axis === "x" ? "Horizontal" : "Vertical"}: ${position[axis].toFixed(1)}%`}
                >
                  {(id) => (
                    <input
                      id={id}
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={position[axis]}
                      className="w-full accent-primary"
                      onChange={(event) =>
                        changePosition(
                          positionPatch(selectedLayer, {
                            ...position,
                            [axis]: Number(event.target.value),
                          }),
                        )
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
            <Field label="Choose an Image Library design">
              {(id) => (
                <select
                  id={id}
                  value={values.imageProductId || ""}
                  onChange={(event) => {
                    setSelectedLayer(event.target.value ? "image" : "headline");
                    setValues((value) => ({
                      ...value,
                      imageProductId: event.target.value || undefined,
                      imageUploadId: undefined,
                      hasUploadedImage: false,
                    }));
                  }}
                >
                  <option value="">Keep selected product preview</option>
                  {library.data?.data.map((image) => (
                    <option key={image.id} value={image.id}>
                      {image.libraryCategory} — {image.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {library.error && (
              <p role="alert" className="text-sm text-red-700">
                {library.error}
              </p>
            )}
            <Field
              label="Upload your photo / logo"
              hint="Sign in to securely save your photo with this design. PNG, JPEG or WebP, up to 8 MB."
            >
              {(id) => (
                <Input
                  id={id}
                  type="file"
                  disabled={uploading}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        file.type,
                      ) ||
                      file.size > 8 * 1024 * 1024
                    ) {
                      setError("Choose a PNG, JPEG or WebP under 8 MB.");
                      return;
                    }
                    try {
                      if (!user) {
                        onSignIn();
                        return;
                      }
                      setUploading(true);
                      const uploaded = await api<{ id: string }>(
                        "/design-images",
                        { method: "POST", raw: file },
                      );
                      setValues((value) => ({
                        ...value,
                        imageUploadId: uploaded.data.id,
                        hasUploadedImage: true,
                      }));
                      setSelectedLayer("image");
                      setError("");
                    } catch (error) {
                      setError(
                        (error as Error).message ||
                          "Could not load this image.",
                      );
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
              )}
            </Field>
            {uploading && <p role="status">Uploading your image…</p>}
            {values.imageUploadId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValues((value) => ({
                    ...value,
                    imageUploadId: undefined,
                    hasUploadedImage: false,
                  }));
                }}
              >
                Remove photo
              </Button>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.square}
                onChange={(e) => update("square", e.target.checked)}
              />{" "}
              Square format
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="text-sm text-emerald-700">
                {success}
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={exportPng} disabled={uploading || !canExport}>
                <Download size={20} />
                Download preview PNG
              </Button>
              <Button
                variant="outline"
                onClick={save}
                disabled={busy || uploading || !canExport}
              >
                <Save size={20} />
                {busy ? "Saving…" : "Save to my designs"}
              </Button>
              {onApply && (
                <Button
                  variant="outline"
                  disabled={uploading || !canExport}
                  onClick={() => {
                    onApply(values);
                    onOpenChange(false);
                  }}
                >
                  Apply to this order
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
