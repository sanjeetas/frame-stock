import { useEffect, useRef, useState, useCallback } from "react";
import { Download, Save } from "lucide-react";
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
          Edit your proof, download a watermarked preview, or save it to your
          account.
        </DialogDescription>
        <div className="mt-6 grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="self-start bg-slate-100 p-4">
            <ProofCanvas settings={values} onCanvas={acceptCanvas} />
          </div>
          <div className="space-y-4">
            <Field label="Headline">
              {(id) => (
                <Input
                  id={id}
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
            <Field label="Text size">
              {(id) => (
                <input
                  id={id}
                  className="w-full accent-primary"
                  type="range"
                  min={24}
                  max={100}
                  value={values.size}
                  onChange={(e) => update("size", Number(e.target.value))}
                />
              )}
            </Field>
            <Field label="Text position">
              {(id) => (
                <input
                  id={id}
                  className="w-full accent-primary"
                  type="range"
                  min={130}
                  max={650}
                  value={values.y}
                  onChange={(e) => update("y", Number(e.target.value))}
                />
              )}
            </Field>
            <Field label="Choose an Image Library design">
              {(id) => (
                <select
                  id={id}
                  value={values.imageProductId || ""}
                  onChange={(event) =>
                    setValues((value) => ({
                      ...value,
                      imageProductId: event.target.value || undefined,
                      imageUploadId: undefined,
                      hasUploadedImage: false,
                    }))
                  }
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
