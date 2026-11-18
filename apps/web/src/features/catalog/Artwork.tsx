import { useState } from "react";
import { SampleIllustration } from "./SampleIllustration";
import type { Product } from "../../types";
import { imageUrl } from "../../lib/utils";
export function Artwork({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  if (product.image && failedImage !== product.image)
    return (
      <img
        className={className + " h-full w-full object-contain"}
        src={imageUrl(product.image)}
        alt={`${product.title} — product preview`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedImage(product.image)}
      />
    );
  if (product.image || product.sourceProductId)
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 p-6 text-center text-sm text-slate-500">
        {product.image ? "Product preview unavailable" : "Product image not provided"}
      </div>
    );
  return (
    <svg
      className={className + " h-full w-full"}
      viewBox="0 0 640 480"
      role="img"
      aria-label={product.title + " watermarked preview"}
    >
      <defs>
        <pattern
          id={"w" + product.id}
          width="200"
          height="100"
          patternTransform="rotate(-25)"
          patternUnits="userSpaceOnUse"
        >
          <text x="10" y="55" fill={product.fg} opacity=".18" fontSize="18">
            PHULO PREVIEW
          </text>
        </pattern>
      </defs>
      <rect width="640" height="480" fill={product.bg} />
      <SampleIllustration product={product} />
      <text x="34" y="410" fill={product.fg} fontSize="31" fontFamily="Georgia">
        {product.title}
      </text>
      <text x="36" y="440" fill={product.fg} fontSize="10" letterSpacing="3">
        PHULO ORIGINAL SAMPLE
      </text>
      <rect width="640" height="480" fill={`url(#w${product.id})`} />
    </svg>
  );
}
