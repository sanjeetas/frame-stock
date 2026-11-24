import { ProductVariations } from "../editor/ProductVariations";
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
import { MagnetTemplates } from "../editor/MagnetTemplates";
import { applyMagnetLayout } from "../editor/magnetTemplate";
import type { CustomMagnetCut } from "../editor/magnetCuts";
interface Props {
  product: Product | null;
  onClose: () => void;
  onAdd: (item: CartItem) => void;
  onSignIn: () => void;
}
export function ProductDialog({ product: p, onClose, onAdd, onSignIn }: Props) {
  const isMagnet =
    p?.customisation?.family === "Magnets" && p.title !== "Magnet Calendars";
  const [choosingTemplate, setChoosingTemplate] = useState(!!p?.customisation && !isMagnet);
  const [options, setOptions] = useState<Record<string, string>>(() => {
    const fields = p?.customisation?.options || [];
    const initial = Object.fromEntries(fields.map((field) => [field.key, field.values[0]!]));
    if (isMagnet) {
      const acrylic = /acrylic/i.test(p?.title || "");
      for (const [key, value] of [["orientation", acrylic ? "Square" : "Landscape"], ["shape", acrylic ? "Circle" : "Rectangle"]])
        if (fields.find((field) => field.key === key)?.values.includes(value!)) initial[key!] = value!;
    }
    return initial;
  });
  const [quantity, setQuantity] = useState("1");
  const [customCut, setCustomCut] = useState<CustomMagnetCut>("heart");
  const validQuantity = Number.isInteger(Number(quantity)) && Number(quantity) >= 1 && Number(quantity) <= 10000;
  const [proofSide, setProofSide] = useState<"front" | "back">("front");
  const artworkRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [editor, setEditor] = useState(false),
    [design, setDesign] = useState<DesignSettings | undefined>(),
    [error, setError] = useState("");
  const startingDesign = useMemo(
    () => {
      const settings = p?.customisation
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
          };
      if (isMagnet && options.shape === "Custom shape" && settings.studio) settings.studio.shape = customCut;
      return settings;
    },
    [p?.id, options, customCut],
  );
  function chooseProductVariation(settings: DesignSettings) {
    setProofSide(
      settings.productOptions?.sides === "Back only" ? "back" : "front",
    );
    setDesign(settings);
    setChoosingTemplate(false);
    setEditor(true);
  }
  function chooseMagnetVariation(id: string, year: number) {
    if (!p || !startingDesign.studio) return;
    const configured = createProductSettings(p, options, design || startingDesign);
    const scene = { ...configured.studio!, ...(options.shape === "Custom shape" ? { shape: customCut } : {}) };
    setDesign({
      ...configured,
      studio: applyMagnetLayout(scene, id, year),
    });
    setChoosingTemplate(false);
    setEditor(true);
  }
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
        open={!!p && !editor}
        onOpenChange={(v) => {
          if (!v) {
            onClose();
            setDesign(undefined);
            setError("");
          }
        }}
      >
        <DialogContent
          className={
            choosingTemplate
              ? "h-dvh max-h-dvh w-screen max-w-none rounded-none p-0"
              : "max-w-4xl"
          }
        >
          {p && choosingTemplate ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b px-5 py-4 pr-14">
                <DialogTitle className="text-lg font-semibold">
                  {p.title} — choose a variation
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChoosingTemplate(false)}
                >
                  Product details
                </Button>
              </div>
              <DialogDescription className="sr-only">
                Choose a design sample to open its editable photo, logo and text
                placeholders.
              </DialogDescription>
              {isMagnet ? (
                <MagnetTemplates
                  product={p}
                  scene={startingDesign.studio}
                  quantity={Number(quantity)}
                  selected={design?.studio?.template || ""}
                  disabled={false}
                  onSelect={chooseMagnetVariation}
                  onUpload={() =>
                    chooseMagnetVariation(
                      "full-photo",
                      new Date().getUTCFullYear() + 1,
                    )
                  }
                />
              ) : (
                <ProductVariations
                  product={p}
                  options={options}
                  onOptionsChange={setOptions}
                  selected={design?.studio?.template}
                  onSelect={chooseProductVariation}
                />
              )}
            </>
          ) : (
            p && (
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
                  {isMagnet && <p className="mb-3 text-sm font-semibold text-cyan-700">1. Specifications → 2. Design → 3. Edit → 4. Review</p>}
                  <DialogTitle className="text-2xl font-bold">
                    {p.title}
                  </DialogTitle>
                  <DialogDescription className="my-3 text-sm leading-6 text-slate-500">
                    {p.description}
                  </DialogDescription>
                  <p className="mb-5 text-xl font-bold text-primary">
                    {<Price product={p} />}{" "}
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
                                    disabled={isMagnet && option.key === "orientation" && ["Circle", "Custom shape"].includes(options.shape || "")}
                                    onChange={(e) => {
                                      const next = {
                                        ...options,
                                        [option.key]: e.target.value,
                                      };
                                      if (isMagnet && option.key === "shape" && ["Circle", "Custom shape"].includes(e.target.value)) next.orientation = "Square";
                                      setOptions(next);
                                      if (design)
                                        setDesign(
                                          createProductSettings(
                                            p,
                                            next,
                                            design,
                                          ),
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
                          {isMagnet && options.shape === "Custom shape" && <label className="block text-sm font-semibold">
                            Custom cut preview (subject to quote)
                            <select className="mt-2 w-full" value={customCut} onChange={(e) => {
                              const cut = e.target.value as CustomMagnetCut;
                              setCustomCut(cut);
                              if (design?.studio) setDesign({ ...design, artworkApproved: false, studio: { ...design.studio, shape: cut } });
                            }}><option value="heart">Heart</option><option value="starburst">Starburst</option></select>
                          </label>}
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
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
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
                            placeholder={isMagnet ? "Finished dimensions, material, occasion or any special cut requirements" : "e.g. 3 × 6 ft, outdoor, matte finish"}
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
                      {isMagnet && !design && <div className="grid gap-3 sm:grid-cols-2">
                        <Button type="button" disabled={!validQuantity} onClick={() => setChoosingTemplate(true)}>Browse designs</Button>
                        <Button type="button" variant="outline" disabled={!validQuantity} onClick={() => chooseMagnetVariation("full-photo", new Date().getUTCFullYear() + 1)}>Upload design</Button>
                      </div>}
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
                      {!(isMagnet && !design) && (p.customisation ||
                        p.editable ||
                        p.group === "Customised Products" ||
                        /visiting.?card|business.?card/i.test(p.title)) && (
                        <Button
                          type="button"
                          className="w-full"
                          variant="outline"
                          onClick={() =>
                            p.customisation && !design
                              ? setChoosingTemplate(true)
                              : setEditor(true)
                          }
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
            )
          )}
        </DialogContent>
      </Dialog>
      <DesignEditor
        startInEditor={!!p?.customisation}
        product={p || undefined}
        quantity={validQuantity ? Number(quantity) : undefined}
        open={editor}
        onOpenChange={setEditor}
        initial={design || startingDesign}
        onApply={(settings) => {
          setProofSide(
            settings.productOptions?.sides === "Back only" ? "back" : "front",
          );
          setDesign(settings);
          if (settings.studio?.shape === "heart" || settings.studio?.shape === "starburst") setCustomCut(settings.studio.shape);
          if (p?.customisation && settings.productOptions)
            setOptions(settings.productOptions);
        }}
        onSignIn={onSignIn}
      />
    </>
  );
}
