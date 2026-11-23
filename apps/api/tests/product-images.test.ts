import test from "node:test";
import assert from "node:assert/strict";
import { productImage } from "../src/product-images.js";

test("magnet photography replaces shipped placeholders while preserving admin images and calendars", () => {
  for (const [title, expected] of [["Photo Magnets", "photo"], ["Fridge Magnets", "fridge"], ["Acrylic Photo Magnets", "acrylic"], ["Custom Photo Fridge Magnet", "photo"]]) {
    const row = { title, image: "assets/single-photo-magnet.svg", customisation: { family: "Magnets" } };
    assert.equal(productImage(row), `assets/magnet-${expected}.webp`);
    assert.equal(row.image, "assets/single-photo-magnet.svg");
    assert.equal(productImage({ ...row, image: "/api/previews/admin.png" }), "/api/previews/admin.png");
  }
  assert.equal(productImage({ title: "Magnet Calendars", customisation: { family: "Magnets" }, image: "assets/single-photo-magnet.svg" }), "assets/single-photo-magnet.svg");
});
