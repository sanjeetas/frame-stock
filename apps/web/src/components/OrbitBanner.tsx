import { AnimatedPrinter } from "./AnimatedPrinter";
import { BannerLogo } from "./BannerLogo";
import { useId } from "react";
import { asset } from "../lib/utils";

// These coordinates reference the circles already present in PHULO's original
// 1600×750 banner. SVG viewports reuse that same file; the artwork stays intact.
const photos = [
  { x: 910, y: 94, name: "Solvent printing" },
  { x: 1019, y: 147, name: "Router cutting" },
  { x: 1061, y: 253, name: "Plotter cutting" },
  { x: 1008, y: 356, name: "Roll printing" },
  { x: 902, y: 401, name: "ID card printing" },
  { x: 796, y: 355, name: "Large format printing" },
  { x: 754, y: 245, name: "Digital printing" },
  { x: 800, y: 140, name: "Laser cutting" },
];

export function OrbitBanner() {
  const id = useId().replace(/:/g, "");
  const source = asset("assets/slides/phulo-printing.webp");
  return (
    <svg className="phulo-orbit-banner" viewBox="0 0 1600 750" role="img" aria-label="PHULO Multi Graphics: a photo printer produces a colourful sheet while eight service photos orbit the company logo, with each photo highlighted and enlarged in turn. Contact 7400006069 or 8451010020.">
      <defs>
        <clipPath id={`${id}-centre`}><circle cx="908" cy="253" r="91" /></clipPath>
        <clipPath id={`${id}-offer`}><circle cx="753" cy="494" r="116" /></clipPath>
        {photos.map((_, index) => {
          const angle = (index * 45 - 90) * Math.PI / 180;
          return <clipPath id={`${id}-photo-${index}`} key={index}>
            <circle cx={908 + Math.cos(angle) * 158} cy={253 + Math.sin(angle) * 158} r="54" />
          </clipPath>;
        })}
      </defs>
      <image href={source} width="1600" height="750" />
      <AnimatedPrinter original={source} />
      <BannerLogo source={source} variant="printing" />
      <g className="phulo-orbit-art" aria-hidden="true">
        <circle cx="908" cy="253" r="232" fill="#002b55" />
        <circle cx="908" cy="253" r="225" fill="#fff" stroke="#bceefa" strokeWidth="3" />
        <circle cx="908" cy="253" r="214" fill="#e4f6fc" />
        <circle className="phulo-orbit-guide banner-animated" cx="908" cy="253" r="158" fill="none" stroke="#89c7dc" strokeWidth="2" strokeDasharray="8 8" />
        <circle cx="908" cy="253" r="99" fill="#fff" />
        <circle className="phulo-orbit-halo banner-animated" cx="908" cy="253" r="98" fill="none" stroke="#08bde3" strokeWidth="3" />
        <g className="phulo-centre-logo-motion banner-animated">
          <image href={source} width="1600" height="750" clipPath={`url(#${id}-centre)`} />
        </g>
        <g className="phulo-orbit-track">
          {photos.map((photo, index) => {
            const angle = (index * 45 - 90) * Math.PI / 180;
            const x = 908 + Math.cos(angle) * 158;
            const y = 253 + Math.sin(angle) * 158;
            const origin = `${x}px ${y}px`;
            return <g key={photo.name} className="phulo-orbit-upright" style={{ transformOrigin: origin }}>
              <g className="phulo-orbit-focus" style={{ transformOrigin: origin, animationDelay: `${-index * 2.25}s` }}>
                <title>{photo.name}</title>
                <circle cx={x} cy={y} r="59" fill="white" />
                <g clipPath={`url(#${id}-photo-${index})`}>
                  <svg x={x - 54} y={y - 54} width="108" height="108" viewBox={`${photo.x - 54} ${photo.y - 54} 108 108`}>
                    <image href={source} width="1600" height="750" />
                  </svg>
                </g>
                <circle className="phulo-orbit-highlight" cx={x} cy={y} r="59" fill="none" strokeWidth="5" style={{ animationDelay: `${-index * 2.25}s` }} />
              </g>
            </g>;
          })}
        </g>
        {/* The original offer sits in front of the photo ring. */}
        <image href={source} width="1600" height="750" clipPath={`url(#${id}-offer)`} />
      </g>
    </svg>
  );
}
