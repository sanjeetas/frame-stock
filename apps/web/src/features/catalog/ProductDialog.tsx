import { useState, useRef, useMemo, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input, Textarea } from "../../components/ui/input";
import { Field } from "../../components/Field";
import { Artwork } from "./Artwork";
import { DesignEditor, initialDesign } from "../editor/DesignEditor";
import type { Product, CartItem, DesignSettings } from "../../types";
import { imageUrl } from "../../lib/utils";
import { LicenseRequest } from "../library/LicenseRequest";
import { ProofCanvas } from "../editor/ProofCanvas";
import { Price } from "./Price";
import { createProductSettings } from "../editor/studioTemplates";
interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  onSignIn: () => void;
}
export function ProductDialog({ product: p, onClose, onAdd, onSignIn }: Props) {
  const [options, setOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (p?.customisation?.options || []).map((option) => [
        option.key,
        option.values[0]!,
      ]),
    ),
  );
  const [proofSide, setProofSide] = useState<"front" | "back">("front");
  const artworkRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [editor, setEditor] = useState(false),
    [design, setDesign] = useState<DesignSettings | undefined>(),
    [error, setError] = useState("");
  const startingDesign = useMemo(
    () =>
      p?.customisation
        ? createProductSettings(p, options)
        : {
            ...initialDesign,
            headline: "",
            subtitle: "",
            ...(p?.kind === "image"
              ? { imageProductId: p.id }
              : p
                ? { baseProductId: p.id }
                : {}),
          },
    [p?.id, options],
  );
  async function downloadPreview() {
    if (!p) return;
    setDownloading(true);
    setError("");
    try {
      let blob: Blob;
      const svg = artworkRef.current?.querySelector("svg");
      if (design?.studio) {
        const { studioPreview } = await import("../editor/studioCanvas");
        const rendered = await studioPreview(
          design.studio,
          "front",
          design.baseProductId,
        );
        blob = await (await fetch(rendered)).blob();
      } else if (svg)
        blob = new Blob([new XMLSerializer().serializeToString(svg)], {
          type: "image/svg+xml",
        });
      else {
        const response = await fetch(imageUrl(p.image));
        if (!response.ok) throw new Error();
        blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error();
      }
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download =
        p.slug +
        "-watermarked-preview." +
        (blob.type.includes("svg")
          ? "svg"
          : blob.type.includes("jpeg")
            ? "jpg"
            : blob.type.includes("webp")
              ? "webp"
              : "png");
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError("Preview download unavailable. Please contact PHULO.");
    } finally {
      setDownloading(false);
    }
  }
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!p) return;
    const form = new FormData(e.currentTarget),
      quantity = Number(form.get("quantity"));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      setError("Quantity must be between 1 and 10,000.");
      return;
    }
    if (p.customisation && (!design?.artworkApproved || !design.studio)) {
      setError(
        "Customise your artwork and approve its preview before adding it to your order.",
      );
      return;
    }
    onAdd({
      key: crypto.randomUUID(),
      productId: p.id,
      title: p.title,
      unit: p.unit,
      price: p.customisation?.quoteRequired ? null : p.price,
      quantity,
      customization: {
        requirements: String(form.get("requirements") || ""),
        ...(p.customisation ? { options } : {}),
        ...(design ? { design } : {}),
      },
    });
    onClose();
  }
  return (
    <>
      <Dialog
        open={!!p}
        onOpenChange={(v) => {
          if (!v) {
            onClose();
            setDesign(undefined);
            setError("");
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          {p && (
            <div className="grid gap-6 md:grid-cols-2">
              <div
                ref={artworkRef}
                className="aspect-square overflow-hidden rounded-lg bg-slate-100"
              >
                {design ? (
                  <ProofCanvas settings={design} side={proofSide} />
                ) : (
                  <Artwork product={p} />
                )}
              </div>
              <div>
                <p className="mb-2 text-xs tracking-widest text-cyan-700">
                  {p.category}
                </p>
                <DialogTitle className="text-2xl font-bold">
                  {p.title}
                </DialogTitle>
                <DialogDescription className="my-3 text-sm leading-6 text-slate-500">
                  {p.description}
                </DialogDescription>
                <p className="mb-5 text-xl font-bold text-primary">
                  {p.customisation?.quoteRequired ? (
                    "Price on request"
                  ) : (
                    <Price product={p} />
                  )}{" "}
                  <span className="text-xs font-normal">
                    {p.price !== null && !p.priceDisplay ? "/ " + p.unit : ""}
                  </span>
                </p>
                {p.libraryCategory ? (
                  <LicenseRequest
                    product={p}
                    onSignIn={onSignIn}
                    onPreview={downloadPreview}
                    downloading={downloading}
                    onEdit={() => setEditor(true)}
                  />
                ) : (
                  <form onSubmit={add} className="space-y-4">
                    {p.customisation && (
                      <>
                        <p className="rounded-lg bg-cyan-50 p-3 text-sm text-primary">
                          Choose your specifications, then create and approve
                          your artwork. PHULO will confirm the final print
                          quote.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {p.customisation.options.map((option) => (
                            <Field key={option.key} label={option.label}>
                              {(id) => (
                                <select
                                  id={id}
                                  className="w-full"
                                  value={options[option.key]}
                                  onChange={(e) => {
                                    const next = {
                                      ...options,
                                      [option.key]: e.target.value,
                                    };
                                    setOptions(next);
                                    if (design)
                                      setDesign(
                                        createProductSettings(p, next, design),
                                      );
                                    setError("");
                                  }}
                                >
                                  {option.values.map((value) => (
                                    <option key={value}>{value}</option>
                                  ))}
                                </select>
                              )}
                            </Field>
                          ))}
                        </div>
                        {design?.studio &&
                          (design.studio.twoSided ||
                            design.studio.format === "card") && (
                            <div
                              className="flex gap-2"
                              aria-label="Preview artwork side"
                            >
                              {(["front", "back"] as const).map((side) => (
                                <Button
                                  key={side}
                                  type="button"
                                  size="sm"
                                  variant={
                                    proofSide === side ? "default" : "outline"
                                  }
                                  onClick={() => setProofSide(side)}
                                  className="capitalize"
                                >
                                  {side} preview
                                </Button>
                              ))}
                            </div>
                          )}
                      </>
                    )}
                    <Field label="Quantity / area units" error={error}>
                      {(id) => (
                        <Input
                          id={id}
                          name="quantity"
                          type="number"
                          defaultValue={1}
                          min={1}
                          max={10000}
                        />
                      )}
                    </Field>
                    <Field label="Size, material & requirements">
                      {(id) => (
                        <Textarea
                          id={id}
                          name="requirements"
                          maxLength={2000}
                          placeholder="e.g. 3 × 6 ft, outdoor, matte finish"
                        />
                      )}
                    </Field>
                    {design && (
                      <p role="status" className="text-sm text-emerald-700">
                        {design.artworkApproved
                          ? "Artwork approved and ready for your order."
                          : "Options changed — review your artwork again."}
                      </p>
                    )}
                    <Button
                      className="w-full"
                      disabled={!!p.customisation && !design?.artworkApproved}
                    >
                      {p.kind === "image"
                        ? "Add HD license request"
                        : "Add to order"}
                    </Button>
                    {p.kind === "image" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={downloading}
                        onClick={downloadPreview}
                      >
                        {downloading
                          ? "Preparing preview…"
                          : "Download free preview"}
                      </Button>
                    )}
                    {(p.customisation ||
                      p.editable ||
                      p.group === "Customised Products" ||
                      /visiting.?card|business.?card/i.test(p.title)) && (
                      <Button
                        type="button"
                        className="w-full"
                        variant="outline"
                        onClick={() => setEditor(true)}
                      >
                        {/visiting.?card|business.?card/i.test(p.title)
                          ? "Choose template & customise ↗"
                          : design
                            ? "Edit / review your artwork ↗"
                            : "Start designing ↗"}
                      </Button>
                    )}
                    <Button asChild variant="outline" className="w-full">
                      <a
                        href={
                          "https://wa.me/918451010020?text=" +
                          encodeURIComponent(
                            "Hi PHULO, I need a quote for " + p.title,
                          )
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Discuss on WhatsApp ↗
                      </a>
                    </Button>
                  </form>
                )}
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  {p.kind === "image"
                    ? "Free watermarked preview. HD originals unlock in My image downloads after PHULO verifies payment."
                    : "Product images show representative print examples. Final size, material, availability and pricing are confirmed before production."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <DesignEditor
        product={p || undefined}
        open={editor}
        onOpenChange={setEditor}
        initial={design || startingDesign}
        onApply={setDesign}
        onSignIn={onSignIn}
      />
    </>
  );
}
