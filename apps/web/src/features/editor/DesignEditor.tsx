import { useEffect, useRef, useState } from "react";
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
    [photo, setPhoto] = useState<ImageBitmap | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [savedId, setSavedId] = useState(existingId);
  useEffect(() => {
    if (open) {
      setValues(initial || initialDesign);
      setPhoto(null);
      setError("");
      setSuccess("");
      setSavedId(existingId);
    }
  }, [open, initial, existingId]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !open) return;
    c.width = 1200;
    c.height = values.square ? 1200 : 900;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = values.bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = values.fg;
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.ellipse(700 + i * 35, 200 + i * 22, 140, 95, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (photo) {
      const ratio = Math.min(950 / photo.width, 380 / photo.height);
      ctx.drawImage(
        photo,
        600 - (photo.width * ratio) / 2,
        60,
        photo.width * ratio,
        photo.height * ratio,
      );
    }
    ctx.fillStyle = values.fg;
    ctx.textAlign = "center";
    ctx.font = `${values.size}px ${values.font}`;
    const words = values.headline.split(" ");
    let row = "",
      line = 0;
    for (const word of words) {
      if (ctx.measureText(row + word).width > 1050 && row) {
        ctx.fillText(row, 600, values.y + line * values.size * 1.2);
        row = "";
        line++;
      }
      if (line > 2) break;
      row += word + " ";
    }
    if (line <= 2) ctx.fillText(row, 600, values.y + line * values.size * 1.2);
    ctx.font = "24px " + values.font;
    ctx.fillText(
      values.subtitle,
      600,
      Math.min(c.height - 70, values.y + values.size * 2.5),
      1050,
    );
    ctx.font = "13px Arial";
    ctx.fillText("PHULO CUSTOM DESIGN PREVIEW", 600, c.height - 30);
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.rotate(-0.4);
    ctx.font = "23px Arial";
    for (let y = -400; y < 1800; y += 160)
      for (let x = -600; x < 1800; x += 340)
        ctx.fillText("PHULO PREVIEW", x, y);
    ctx.restore();
  }, [values, photo, open]);
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
            <canvas
              ref={canvas}
              className="w-full shadow-sm"
              aria-label="Custom design preview"
            />
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
            <Field
              label="Upload your photo / logo"
              hint="Photo pixels remain in this browser. Send the original separately when confirming your order."
            >
              {(id) => (
                <Input
                  id={id}
                  type="file"
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
                      setPhoto(await createImageBitmap(file));
                      update("hasUploadedImage", true);
                      setError("");
                    } catch {
                      setError("Could not load this image.");
                    }
                  }}
                />
              )}
            </Field>
            {photo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhoto(null);
                  update("hasUploadedImage", false);
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
              <Button onClick={exportPng}>
                <Download size={20} />
                Download preview PNG
              </Button>
              <Button variant="outline" onClick={save} disabled={busy}>
                <Save size={20} />
                {busy ? "Saving…" : "Save to my designs"}
              </Button>
              {onApply && (
                <Button
                  variant="outline"
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
