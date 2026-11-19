import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  productVariation,
  variationsForProduct,
} from "../src/features/editor/productVariations.ts";
import { settings } from "../../api/src/schemas/index.ts";

const catalog = JSON.parse(
  await readFile(
    new URL("../../../public/custom-products.json", import.meta.url),
    "utf8",
  ),
);

test("every custom product family has real editable variations with safe blank mockups", async () => {
  const families = new Set<string>();
  for (const row of catalog.products) {
    families.add(row.customisation.family);
    if (row.customisation.family === "Magnets") continue;
    const product = { ...row, id: "012345678901234567890123" };
    const options = Object.fromEntries(
      row.customisation.options.map((o: any) => [o.key, o.values[0]]),
    );
    const variations = variationsForProduct(product);
    assert.ok(variations.length >= 3, row.title);
    for (const variation of variations) {
      const design = productVariation(product, options, variation.id);
      const parsed = settings.parse(design);
      assert.equal(parsed.baseProductId, product.id);
      assert.equal(parsed.artworkApproved, false);
      assert.ok(parsed.studio!.pages.front.elements.length <= 40);
      assert.notEqual(parsed.studio!.mockupImage?.startsWith("https:"), true);
      if (parsed.studio!.mockupImage) {
        assert.match(
          parsed.studio!.mockupImage,
          /^assets\/custom-[a-z-]+\.svg$/,
        );
        await readFile(
          new URL(
            "../../../public/" + parsed.studio!.mockupImage,
            import.meta.url,
          ),
        );
      }
    }
  }
  assert.equal(families.size, 18);
});

test("product changes preserve customer image references and crops in the new editable slot", () => {
  const mug = catalog.products.find(
    (p: any) => p.title === "Personalised Mugs",
  );
  const product = { ...mug, id: "012345678901234567890123" };
  const original = productVariation(product, {}, "photo-message");
  const slot = original.studio!.pages.front.elements.find(
    (e) => e.id === "product-photo-placeholder",
  )!;
  Object.assign(slot, {
    type: "image",
    uploadId: "123456789012345678901234",
    crop: { x: 0.1, y: 0, width: 0.8, height: 1 },
  });
  original.studio!.pages.front.elements =
    original.studio!.pages.front.elements.filter(
      (e) => e.id !== "product-photo-label",
    );
  const next = productVariation(product, {}, "full-photo", original);
  const image = next.studio!.pages.front.elements.find(
    (e) => e.type === "image",
  )!;
  assert.equal(image.uploadId, slot.uploadId);
  assert.deepEqual(image.crop, slot.crop);
  assert.equal(next.studio!.mockupImage, "assets/custom-mug.svg");
  assert.equal(
    next.studio!.pages.front.elements.some(
      (e) => e.id === "product-photo-label",
    ),
    false,
  );
  assert.equal(original.studio!.template, "photo-message");
  for (const mockupImage of [
    "https://evil.test/x.svg",
    "assets/../../secret.svg",
    "/api/design-images/123",
    "assets/private.svg",
  ]) {
    assert.equal(
      settings.safeParse({ ...next, studio: { ...next.studio, mockupImage } })
        .success,
      false,
    );
  }
});

test("product editor loads only the blank mockup, keeps the editable layers separate and exports moved text", async () => {
  const native = await import("fabric/node");
  const fabric = await import("fabric");
  const { Image } = await import("canvas");
  fabric.setEnv(native.getEnv());
  const { renderStudioPage, readStudioPage, studioPreview } =
    await import("../src/features/editor/studioCanvas.ts");
  const fixture = new native.StaticCanvas(undefined, {
    width: 1200,
    height: 1000,
    backgroundColor: "#3478ad",
  });
  const bytes = Buffer.from(
    fixture.toDataURL({ format: "png" }).split(",")[1]!,
    "base64",
  );
  await fixture.dispose();
  const originalFetch = globalThis.fetch,
    OriginalImage = globalThis.Image;
  const requests: string[] = [];
  globalThis.fetch = async (url, ...args) => {
    if (String(url).startsWith("blob:")) return originalFetch(url, ...args);
    requests.push(String(url));
    assert.match(String(url), /assets\/custom-mug\.svg$/);
    return new Response(bytes, { headers: { "Content-Type": "image/png" } });
  };
  globalThis.Image = class extends Image {
    url = "";
    set src(value: string) {
      this.url = value;
    }
    get src() {
      return this.url;
    }
    async decode() {
      super.src = Buffer.from(
        await (await originalFetch(this.url)).arrayBuffer(),
      );
    }
  } as any;
  const canvas = new fabric.Canvas(undefined);
  try {
    const mug = catalog.products.find(
      (p: any) => p.title === "Personalised Mugs",
    );
    const design = productVariation(
      { ...mug, id: "012345678901234567890123" },
      {},
      "photo-message",
    );
    await renderStudioPage(
      canvas,
      design.studio!,
      "front",
      design.baseProductId,
    );
    assert.equal(requests.length, 1);
    assert.equal(canvas.getObjects()[0]!.selectable, false);
    const headline = canvas
      .getObjects()
      .find((o) => (o as any).studioElement?.id === "product-headline")!;
    headline.set({ left: 520, top: 600, text: "My mug" });
    headline.setCoords();
    const page = readStudioPage(canvas);
    assert.equal(
      page.elements.length,
      design.studio!.pages.front.elements.length,
    );
    assert.equal(
      page.elements.find((e) => e.id === "product-headline")!.text,
      "My mug",
    );
    design.studio!.pages.front = page;
    assert.match(
      await studioPreview(design.studio!, "front", design.baseProductId),
      /^data:image\/png;base64,/,
    );
    await renderStudioPage(
      canvas,
      design.studio!,
      "front",
      design.baseProductId,
      false,
      "artwork",
    );
    assert.equal(canvas.getObjects().length, page.elements.length);
    assert.equal(
      readStudioPage(canvas).elements.find((e) => e.id === "product-headline")!
        .left,
      520,
    );
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Image = OriginalImage;
    await canvas.dispose();
  }
});

test("photo placeholders are identified before approval and disappear once the customer photo replaces them", async () => {
  const { artworkWarnings } =
    await import("../src/features/editor/studioActions.ts");
  const mug = catalog.products.find(
    (p: any) => p.title === "Personalised Mugs",
  );
  const design = productVariation(
    { ...mug, id: "012345678901234567890123" },
    {},
    "full-photo",
  );
  assert.ok(
    artworkWarnings(design.studio!).some((w) =>
      w.includes("replace the photo or logo"),
    ),
  );
  const slot = design.studio!.pages.front.elements.find(
    (e) => e.id === "product-photo-placeholder",
  )!;
  Object.assign(slot, { type: "image", uploadId: "123456789012345678901234" });
  assert.equal(
    artworkWarnings(design.studio!).some((w) =>
      w.includes("replace the photo or logo"),
    ),
    false,
  );
});

test("calendar products offer actual year-based layouts with a replaceable photo slot", () => {
  const row = catalog.products.find((p: any) => p.title === "Desk Calendars");
  const product = { ...row, id: "012345678901234567890123" };
  assert.equal(variationsForProduct(product).length, 4);
  const plain = productVariation(product, {}, "calendar-plain");
  assert.equal(
    plain.studio!.pages.front.elements.some(
      (e) => e.id === "product-photo-placeholder",
    ),
    false,
  );
  const next = productVariation(product, {}, "calendar-sage", undefined, 2028);
  assert.equal(
    settings
      .parse(next)
      .studio!.pages.front.elements.find((e) => e.id === "calendar-year")!.text,
    "2028",
  );
  assert.match(
    next.studio!.pages.front.elements.find((e) => e.id === "calendar-month-1")!
      .text!,
    /29/,
  );
  assert.ok(
    next.studio!.pages.front.elements.some(
      (e) => e.id === "product-photo-placeholder",
    ),
  );
  assert.equal(
    next.studio!.pages.front.elements.some((e) =>
      e.id.startsWith("magnet-photo-"),
    ),
    false,
  );
});
