import { useId, type CSSProperties } from "react";
import { asset } from "../lib/utils";

interface Props {
  source: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth?: number;
  sourceHeight?: number;
  transparent?: boolean;
}

// The source image is the mask: light touches the actual glyphs, never a
// rectangular strip of background. The clip restricts it to MULTIGRAPHICS.
export function LetterShine({ source, x, y, width, height, sourceWidth = 1600, sourceHeight = 750, transparent = false }: Props) {
  const id = useId().replace(/:/g, "");
  return <g className="letter-shine" aria-hidden="true">
    <defs>
      <clipPath id={`${id}-line`}><rect x={x} y={y} width={width} height={height} /></clipPath>
      <filter id={`${id}-letters`} colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .65 .65 .65 0 -.38" />
        <feComposite in2="SourceAlpha" operator="in" />
      </filter>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={x} y={y} width={width} height={height} style={{ maskType: "alpha" }}>
        <image href={source} width={sourceWidth} height={sourceHeight} filter={transparent ? undefined : `url(#${id}-letters)`} />
      </mask>
      <linearGradient id={`${id}-rainbow`}>
        <stop stopColor="#00cfff" stopOpacity="0" />
        <stop offset=".2" stopColor="#00eaff" />
        <stop offset=".37" stopColor="#f526cc" />
        <stop offset=".48" stopColor="#ffe27a" />
        <stop offset=".55" stopColor="#ffffff" />
        <stop offset=".64" stopColor="#fff4c4" />
        <stop offset=".78" stopColor="#a68aff" />
        <stop offset="1" stopColor="#00cfff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <g clipPath={`url(#${id}-line)`} mask={`url(#${id}-mask)`}>
      <g className="letter-shine-ray banner-animated" style={{ "--shine-travel": `${width + 140}px` } as CSSProperties}>
        <rect x={x - 140} y={y} width="140" height={height} fill={`url(#${id}-rainbow)`} />
      </g>
    </g>
  </g>;
}

export function HeaderLogo() {
  const source = asset("assets/logo.png");
  return <span className="relative block h-24 w-44">
    <img src={source} alt="PHULO Multi Graphics" className="absolute inset-0 h-full w-full object-contain" />
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 430 265" aria-hidden="true">
      <LetterShine source={source} x={28} y={211} width={369} height={28} sourceWidth={430} sourceHeight={265} transparent />
    </svg>
  </span>;
}
