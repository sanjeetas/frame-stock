import { useId } from "react";

// Reuse the logo region of the original banner as an SVG layer. The original
// full banner remains underneath; no source pixels or header dimensions change.
export function BannerLogo({ source, variant }: {
  source: string;
  variant: "printing" | "signage";
}) {
  const id = useId().replace(/:/g, "");
  const box = variant === "printing"
    ? { x: 130, y: 80, width: 510, height: 335, origin: "385px 248px" }
    : { x: 60, y: 55, width: 490, height: 350, origin: "305px 230px" };
  return <>
    <defs><clipPath id={`${id}-brand`}><rect x={box.x} y={box.y} width={box.width} height={box.height} /></clipPath></defs>
    <g className="phulo-brand-motion banner-animated" style={{ transformOrigin: box.origin }} aria-hidden="true">
      <image href={source} width="1600" height="750" clipPath={`url(#${id}-brand)`} />
    </g>
  </>;
}

export function SignageBanner({ source, alt }: { source: string; alt: string }) {
  return <svg className="phulo-photo-banner" viewBox="0 0 1600 750" role="img" aria-label={alt}>
    <image href={source} width="1600" height="750" />
    <BannerLogo source={source} variant="signage" />
  </svg>;
}
