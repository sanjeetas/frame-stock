import { useId } from "react";
import { asset } from "../lib/utils";

export function AnimatedPrinter({ original }: { original: string }) {
  const id = useId().replace(/:/g, "");
  return <g aria-hidden="true" className="phulo-printing-machine">
    <defs>
      <clipPath id={`${id}-output`}><rect x="1195" y="321" width="275" height="165" /></clipPath>
      <clipPath id={`${id}-contact`}><rect x="908" y="554" width="540" height="196" rx="22" /><rect x="1033" y="522" width="285" height="74" /></clipPath>
      <linearGradient id={`${id}-colour`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#00c8ee" /><stop offset=".45" stopColor="#ec008c" /><stop offset="1" stopColor="#ffe04a" />
      </linearGradient>
    </defs>
    {/* Replace only the old machine area with the original flat banner colour. */}
    <rect x="1070" y="110" width="500" height="505" fill="#002b55" />
    <image href={asset("assets/slides/phulo-printer.webp")} x="1100" y="50" width="470" height="470" />
    <g clipPath={`url(#${id}-output)`}>
      <g className="phulo-printer-paper banner-animated">
        <rect x="1211" y="322" width="235" height="150" rx="3" fill="#fff" stroke="#c8d7e1" strokeWidth="2" />
        <rect x="1223" y="334" width="211" height="95" rx="2" fill={`url(#${id}-colour)`} />
        <circle cx="1261" cy="365" r="21" fill="#ffe04a" />
        <path d="M1280 429L1332 348L1387 429Z" fill="#0a3658" opacity=".8" />
        <path d="M1223 415Q1295 365 1434 388V429H1223Z" fill="#00d4ed" opacity=".8" />
        <text x="1225" y="452" fill="#113655" fontSize="16" fontWeight="800" fontFamily="Arial, sans-serif">PHULO · FULL COLOUR</text>
      </g>
    </g>
    <rect x="1204" y="317" width="249" height="6" rx="3" fill="#10141b" />
    <image href={original} width="1600" height="750" clipPath={`url(#${id}-contact)`} />
  </g>;
}
