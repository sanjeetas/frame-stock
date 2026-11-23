import React, { useId } from "react";
import type { StudioDocument } from "./studioTypes";
import { magnetTemplate } from "./magnetTemplate";
import { magnetCutPoints } from "./magnetCuts";

export function MagnetThumbnail({ scene, template, year, name }: {
  scene?: StudioDocument;
  template: string;
  year: number;
  name: string;
}) {
  const id = useId().replace(/:/g, "");
  const width = scene?.width || 1200, height = scene?.height || 900;
  const page = magnetTemplate(width, height, template, year, scene?.shape);
  const area = scene?.printArea || { x: .08, y: .08, width: .84, height: .84 };
  const x = width * area.x, y = height * area.y, w = width * area.width, h = height * area.height;
  const polygon = magnetCutPoints(scene?.shape, w, h);
  const outline = polygon
    ? <polygon points={polygon.map((p) => `${p.x + x},${p.y + y}`).join(" ")} />
    : scene?.shape === "circle" || scene?.shape === "oval"
      ? <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} />
      : <rect x={x} y={y} width={w} height={h} rx={scene?.shape === "rounded" ? 35 : 0} />;
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${name}: single editable magnet`} className="w-full drop-shadow-sm">
    <defs><clipPath id={id}>{outline}</clipPath></defs>
    <g fill={page.background} stroke="#cbd5e1" strokeWidth="3">{outline}</g>
    <g clipPath={`url(#${id})`}>
      {page.elements.map((e) => e.type === "rect"
        ? <rect key={e.id} x={e.left - e.width / 2} y={e.top - e.height / 2} width={e.width} height={e.height} fill={e.fill} />
        : <text key={e.id} x={e.left} y={e.top - ((e.text || "").split("\n").length - 1) * (e.fontSize || 20) * (e.lineHeight || 1.2) / 2} textAnchor="middle" dominantBaseline="middle" fontFamily={e.fontFamily} fontSize={e.fontSize} fill={e.fill}>
          {(e.text || "").split("\n").map((line, index) => <tspan key={index} x={e.left} dy={index ? (e.fontSize || 20) * (e.lineHeight || 1.2) : 0}>{line}</tspan>)}
        </text>)}
    </g>
  </svg>;
}
