import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { StudioPreview } from "./StudioPreview";
import { artworkWarnings, printedSides } from "./studioActions";
import { Button } from "../../components/ui/button";
import type { DesignSettings, Product } from "../../types";
export function StudioReview({
  settings,
  product,
  quantity,
  onBack,
  onConfirm,
}: {
  settings: DesignSettings;
  product?: Product;
  quantity?: number;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [approved, setApproved] = useState(false);
  const warnings = useMemo(
    () =>
      artworkWarnings({
        ...settings.studio!,
        productOptions:
          settings.productOptions || settings.studio?.productOptions,
      }),
    [settings.studio, settings.productOptions],
  );
  const sides = printedSides(settings.studio!, settings.productOptions);
  return (
    <section className="studio-review" aria-label="Review and approve artwork">
      <div className="mx-auto w-full max-w-5xl p-5 sm:p-10">
        <Button autoFocus variant="ghost" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to editing
        </Button>
        <h2 className="mt-6 text-3xl font-bold">Review your artwork</h2>
        <p className="mt-3 leading-7 text-slate-600">
          {sides.length > 1
            ? "Check spelling, contact details, image placement and both sides before applying this design to your order."
            : "Check spelling, your photo placement and the finished shape before applying this design to your order."}
        </p>
        {(product || settings.productOptions) && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
            {product && <p className="font-bold">{product.title}</p>}
            {quantity !== undefined && <span className="rounded-full bg-white px-4 py-2 font-semibold">Quantity: {quantity}</span>}
            {settings.productOptions?.size && (
              <span className="rounded-full bg-white px-4 py-2 font-semibold">
                Size: {settings.productOptions.size}
              </span>
            )}
            {settings.productOptions?.colour && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold">
                {settings.studio?.productColour && (
                  <span
                    className="size-6 rounded-full border border-slate-300"
                    style={{ backgroundColor: settings.studio.productColour }}
                  />
                )}
                Colour: {settings.productOptions.colour}
              </span>
            )}
          </div>
        )}
        {settings.productOptions && (
          <dl className="mt-5 flex flex-wrap gap-3 rounded-xl bg-white p-4 text-sm">
            {Object.entries(settings.productOptions).map(([key, value]) => (
              <div key={key}>
                <dt className="capitalize text-slate-500">{key}</dt>
                <dd className="font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {settings.studio?.surface === "magnet" && ["heart", "starburst"].includes(settings.studio.shape || "") && <p className="mt-4 text-sm font-semibold text-primary">Custom cut: {settings.studio.shape} — subject to PHULO quote confirmation.</p>}
        <div className={`mt-7 grid gap-6 ${sides.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-xl"}`}>
          {sides.map(
            (side) => (
              <div key={side}>
                <h3 className="mb-3 text-lg font-semibold capitalize">
                  {side}
                  {side === "back" &&
                  settings.studio?.mockupImage &&
                  !settings.studio.mockupBackImage
                    ? " artwork"
                    : ""}
                </h3>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <StudioPreview settings={settings} side={side} />
                </div>
              </div>
            ),
          )}
        </div>
        {warnings.length > 0 && (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <p className="flex items-center gap-2 font-bold">
              <AlertTriangle size={20} />
              Please check
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <input
            className="mt-1 size-5"
            type="checkbox"
            checked={approved}
            onChange={(event) => setApproved(event.target.checked)}
          />
          <span>
            I have checked my text, spelling, images and artwork sides. This is
            the design I want to use. Final print specifications and price will
            be confirmed with PHULO.
          </span>
        </label>
        <Button
          className="mt-6 bg-cyan-400 text-slate-950 hover:bg-cyan-300"
          disabled={!approved}
          onClick={onConfirm}
        >
          <CheckCircle2 size={20} />
          Use this artwork
        </Button>
      </div>
    </section>
  );
}
