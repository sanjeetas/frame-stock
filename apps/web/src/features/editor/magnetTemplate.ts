import { element, type StudioDocument } from "./studioTypes.ts";

/** A single front-facing magnet. The photo placeholder is replaceable, not a scene photo. */
export function magnetTemplate(
  width: number,
  height: number,
): StudioDocument["pages"]["front"] {
  return {
    background: "#ffffff",
    elements: [
      element("rect", {
        id: "magnet-photo-placeholder",
        left: width / 2,
        top: height * 0.42,
        width: width * 0.72,
        height: height * 0.56,
        fill: "#c8e9e7",
      }),
      element("text", {
        id: "magnet-photo-label",
        left: width / 2,
        top: height * 0.42,
        width: width * 0.6,
        height: 60,
        text: "YOUR PHOTO",
        fontSize: 42,
        fontFamily: "Arial",
        textAlign: "center",
        fill: "#246862",
      }),
      element("text", {
        id: "magnet-caption",
        left: width / 2,
        top: height * 0.79,
        width: width * 0.72,
        height: 60,
        text: "Our favourite moment",
        fontSize: 38,
        fontFamily: "Georgia",
        textAlign: "center",
        fill: "#103759",
      }),
    ],
  };
}
