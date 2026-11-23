import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createProductSettings } from "../src/features/editor/studioTemplates.ts";
import { applyMagnetLayout } from "../src/features/editor/magnetTemplate.ts";
import { magnetCutPoints } from "../src/features/editor/magnetCuts.ts";
import { MagnetThumbnail } from "../src/features/editor/MagnetThumbnail.tsx";
import { element } from "../src/features/editor/studioTypes.ts";
import { settings } from "../../api/src/schemas/index.ts";
import type { Product } from "../src/types/index.ts";
const catalog = JSON.parse(await readFile(new URL("../../../public/custom-products.json", import.meta.url), "utf8"));
const product = { ...catalog.products.find((p: Product) => p.title === "Photo Magnets"), id: "012345678901234567890123" } as Product;

test("magnet templates retain the selected portrait/square geometry, shape and product identity", () => {
  for (const orientation of ["Portrait", "Landscape", "Square"]) {
    const next = createProductSettings(product, { size: "Small", orientation, shape: "Rounded corners" });
    const scene = applyMagnetLayout(next.studio!, "two-moments");
    assert.equal(scene.width, next.studio!.width);
    assert.equal(scene.height, next.studio!.height);
    assert.equal(scene.productOptions?.orientation, orientation);
    assert.equal(scene.shape, "rounded");
    assert.equal(settings.parse({ ...next, studio: scene }).baseProductId, product.id);
  }
});

test("custom magnet cuts use the allowed custom-shape quote option and survive option/layout changes", () => {
  const options = { size: "Small", shape: "Custom shape", orientation: "Square" };
  const first = createProductSettings(product, options);
  assert.equal(first.studio!.shape, "heart");
  for (const shape of ["heart", "starburst"] as const) {
    const previous = { ...first, studio: { ...first.studio!, shape } };
    const next = createProductSettings(product, { ...options, size: "Large" }, previous);
    next.studio = applyMagnetLayout(next.studio!, "photo-caption");
    assert.equal(next.studio.shape, shape);
    assert.equal(next.productOptions!.shape, "Custom shape");
    assert.equal(settings.parse(next).studio!.shape, shape);
    const points = magnetCutPoints(shape, 800, 800)!;
    assert.equal(Math.min(...points.map((p) => p.x)), 0);
    assert.equal(Math.max(...points.map((p) => p.x)), 800);
    assert.equal(Math.min(...points.map((p) => p.y)), 0);
    assert.equal(Math.max(...points.map((p) => p.y)), 800);
  }
});

test("gallery thumbnails render the selected single magnet cut and the editor's original placeholder colours", () => {
  const next = createProductSettings(product, { size: "Small", shape: "Circle", orientation: "Square" });
  const markup = renderToStaticMarkup(createElement(MagnetThumbnail, { scene: next.studio!, template: "photo-caption", year: 2027, name: "Favourite Moment" }));
  assert.match(markup, /<ellipse/);
  assert.match(markup, /YOUR PHOTO/);
  assert.match(markup, /#c8e9e7/);
  assert.doesNotMatch(markup, /<image|refrigerator|fridge/i);
});

test("native preview/export clips heart and starburst artwork to the selected cut", async () => {
  const native = await import("fabric/node"), fabric = await import("fabric");
  fabric.setEnv(native.getEnv());
  const { renderStudioPage } = await import("../src/features/editor/studioCanvas.ts");
  const sharp = (await import("sharp")).default;
  for (const shape of ["heart", "starburst"] as const) {
    const design = createProductSettings(product, { size: "Small", shape: "Custom shape", orientation: "Square" });
    const scene = { ...design.studio!, shape, width: 400, height: 400 };
    scene.pages.front = { background: "#ffffff", elements: [element("rect", { left: 200, top: 200, width: 400, height: 400, fill: "#ff0000" })] };
    const canvas = new fabric.StaticCanvas(undefined);
    try {
      await renderStudioPage(canvas, scene, "front", product.id, false, "artwork");
      const png = Buffer.from(canvas.toDataURL({ format: "png", multiplier: 1 }).split(",")[1]!, "base64");
      const centre = await sharp(png).extract({ left: 200, top: 200, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
      const corner = await sharp(png).extract({ left: 34, top: 34, width: 1, height: 1 }).removeAlpha().raw().toBuffer();
      assert.ok(centre[0]! > 240 && centre[1]! < 10 && centre[2]! < 10, shape);
      assert.ok(corner[0]! > 240 && corner[1]! > 240 && corner[2]! > 240, shape);
    } finally { await canvas.dispose(); }
  }
});
