import { test } from "node:test";
import assert from "node:assert/strict";
import {
  layerPosition,
  positionPatch,
  pointerDelta,
} from "../src/features/editor/editorGeometry.ts";
const original = {
  headline: "Print",
  subtitle: "Custom",
  bg: "#ffffff",
  fg: "#000000",
  font: "Arial" as const,
  size: 62,
  y: 580,
  square: false,
  hasUploadedImage: false,
};
test("dragging follows the same percentage at mobile and desktop preview sizes", () => {
  assert.deepEqual(
    pointerDelta(
      { x: 100, y: 100 },
      { x: 160, y: 145 },
      { width: 600, height: 450 },
    ),
    { x: 10, y: 10 },
  );
  assert.deepEqual(
    pointerDelta(
      { x: 50, y: 50 },
      { x: 80, y: 72.5 },
      { width: 300, height: 225 },
    ),
    { x: 10, y: 10 },
  );
  assert.deepEqual(
    pointerDelta({ x: 0, y: 0 }, { x: 50, y: 50 }, { width: 0, height: 0 }),
    { x: 0, y: 0 },
  );
});
test("headline, supporting text and image move independently and survive serializing settings", () => {
  const moved = {
    ...original,
    ...positionPatch("headline", { x: 25, y: 30 }),
    ...positionPatch("subtitle", { x: 70, y: 80 }),
    ...positionPatch("image", { x: 55, y: 42 }),
    imageScale: 135,
  };
  const saved = JSON.parse(JSON.stringify(moved));
  assert.deepEqual(layerPosition(saved, "headline"), { x: 25, y: 30 });
  assert.deepEqual(layerPosition(saved, "subtitle"), { x: 70, y: 80 });
  assert.deepEqual(layerPosition(saved, "image"), { x: 55, y: 42 });
  assert.equal(saved.imageScale, 135);
  assert.deepEqual(layerPosition({ ...saved, square: true }, "image"), {
    x: 55,
    y: 42,
  });
});
test("positions clamp at preview edges while older saved proofs retain their placement", () => {
  assert.deepEqual(positionPatch("image", { x: -50, y: 150 }), {
    imageX: 0,
    imageY: 100,
  });
  assert.equal(layerPosition(original, "headline").y, (580 / 900) * 100);
  assert.equal(
    layerPosition({ ...original, baseProductId: "product" }, "image").y,
    43,
  );
  assert.equal(layerPosition(original, "image").y, 50);
});
