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
          /^assets\/(?:custom-[a-z-]+\.svg|mockups\/[a-z-]+\.webp)$/,
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
  assert.equal(next.studio!.mockupImage, "assets/mockups/mug.webp");
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
  fabric.setFilterBackend(new fabric.Canvas2dFilterBackend());
  const { renderStudioPage, readStudioPage, studioPreview } =
    await import("../src/features/editor/studioCanvas.ts");
  const fixture = new native.StaticCanvas(undefined, {
    width: 1200,
    height: 1000,
    backgroundColor: "#3478ad",
  });
  const bytes = Buffer.from(
    fixture.toDataURL({ format: "png", multiplier: 1 }).split(",")[1]!,
    "base64",
  );
  await fixture.dispose();
  const originalFetch = globalThis.fetch,
    OriginalImage = globalThis.Image;
  const requests: string[] = [];
  globalThis.fetch = async (url, ...args) => {
    if (String(url).startsWith("blob:")) return originalFetch(url, ...args);
    requests.push(String(url));
    assert.match(String(url), /assets\/mockups\/mug\.webp$/);
    return new Response(bytes, { headers: { "Content-Type": "image/png" } });
  };
  globalThis.Image = class extends Image {
    url = "";
    constructor() {
      super();
      Object.defineProperty(this, "src", {
        get: () => this.url,
        set: (value: string) => { this.url = value; },
      });
    }
    async decode() {
      const source = Buffer.from(
        await (await originalFetch(this.url)).arrayBuffer(),
      );
      const setter = Object.getOwnPropertyDescriptor(Image.prototype, "src")?.set;
      assert.ok(setter, "node-canvas provides its native image source setter");
      setter.call(this, source);
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
    design.studio!.productColour = "#24282d";
    await renderStudioPage(
      canvas,
      design.studio!,
      "front",
      design.baseProductId,
    );
    canvas.renderAll();
    const pixel = canvas.getContext().getImageData(50, 50, 1, 1).data;
    for (const [i, value] of [7, 19, 31].entries())
      assert.ok(
        Math.abs(pixel[i]! - value) <= 1,
        `Tint channel ${i}: ${pixel[i]}`,
      );
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

test("changing T-shirt colour and size preserves the design and the selected options survive saving", async () => {
  const { createProductSettings } =
    await import("../src/features/editor/studioTemplates.ts");
  const row = catalog.products.find(
    (p: any) => p.title === "Men's Cotton T-Shirts",
  );
  const product = { ...row, id: "012345678901234567890123" };
  const original = productVariation(
    product,
    { size: "XL", colour: "Navy" },
    "photo-message",
  );
  original.studio!.pages.front.elements.find(
    (e) => e.id === "product-headline",
  )!.text = "My shirt";
  const next = createProductSettings(
    product,
    { size: "L", colour: "Red" },
    original,
  );
  assert.equal(original.studio!.productColour, "#153752");
  assert.equal(next.studio!.productColour, "#bd2343");
  assert.deepEqual(next.studio!.productOptions, { size: "L", colour: "Red" });
  assert.deepEqual(next.studio!.pages, original.studio!.pages);
  assert.equal(settings.parse(next).studio!.productOptions!.size, "L");
  assert.equal(next.artworkApproved, false);
});

test("garment cuts use distinct photographic surfaces and matching back views", async () => {
  const { mockupSurface, studioMockup } =
    await import("../src/features/editor/mockupSurfaces.ts");
  const examples: Record<string, string> = {
    "Men's Cotton T-Shirts": "crewneck",
    "Full Sleeve T-Shirts": "long-sleeve",
    "Men's Polo T-Shirts": "polo",
    "Custom Hoodies": "hoodie",
    "Zipper Hoodies": "zip-hoodie",
    "Half Sleeve Dress Shirts": "short-shirt",
    "Full Sleeve Lab Coats": "lab-coat",
    "Half Sleeve Lab Coats": "short-coat",
    "Women's T-Shirts": "women-crew",
    "Kids T-Shirts": "kids-crew",
    "Puffer Jackets": "puffer",
  };
  for (const [title, key] of Object.entries(examples)) {
    const row = catalog.products.find((p: any) => p.title === title);
    assert.ok(row, title);
    const surface = mockupSurface(row)!;
    assert.equal(surface.front, `assets/mockups/${key}.webp`);
    assert.ok(
      surface.area.x + surface.area.width <= 1 &&
        surface.area.y + surface.area.height <= 1,
    );
  }
  const row = catalog.products.find(
    (p: any) => p.title === "Men's Cotton T-Shirts",
  );
  const back = productVariation(
    { ...row, id: "012345678901234567890123" },
    { sides: "Back only", colour: "Navy" },
    "make-it",
  );
  assert.equal(
    studioMockup(back.studio!, "back"),
    "assets/mockups/crew-back.webp",
  );
  assert.equal(back.studio!.pages.front.elements.length, 0);
  assert.ok(
    back.studio!.pages.back.elements.some((e) => e.text?.includes("MAKE IT")),
  );
  const { printedSides, artworkWarnings } =
    await import("../src/features/editor/studioActions.ts");
  assert.deepEqual(printedSides(back.studio!), ["back"]);
  assert.equal(
    artworkWarnings(back.studio!).some((w) =>
      w.includes("front artwork is empty"),
    ),
    false,
  );
});

test("ready-made designs have real editable artwork and adapt default ink to garment colour", async () => {
  const { createProductSettings } =
    await import("../src/features/editor/studioTemplates.ts");
  const row = catalog.products.find(
      (p: any) => p.title === "Men's Cotton T-Shirts",
    ),
    product = { ...row, id: "012345678901234567890123" };
  const designs = variationsForProduct(product);
  assert.equal(designs[0]!.id, "make-it");
  for (const item of designs.slice(0, 4)) {
    const draft = productVariation(product, { colour: "White" }, item.id);
    assert.ok(draft.studio!.pages.front.elements.length >= 2);
    assert.equal(
      draft.studio!.pages.front.elements.some(
        (e) => e.id.includes("placeholder") || e.id === "design-background",
      ),
      false,
    );
  }
  const white = productVariation(
    product,
    { colour: "White", size: "M" },
    "make-it",
  );
  white.studio!.pages.front.elements.find(
    (e) => e.id === "product-headline",
  )!.text = "OUR TEAM";
  const navy = createProductSettings(
    product,
    { colour: "Navy", size: "L" },
    white,
  );
  assert.equal(
    navy.studio!.pages.front.elements.find((e) => e.id === "product-headline")!
      .fill,
    "#fff6e6",
  );
  assert.equal(
    navy.studio!.pages.front.elements.find((e) => e.id === "product-headline")!
      .text,
    "OUR TEAM",
  );
  const second = createProductSettings(
    product,
    { colour: "Black", size: "XL" },
    navy,
  );
  assert.deepEqual(second.studio!.pages, navy.studio!.pages);
});

test("photographic assets stay small, transparent and usable as local preview resources", async () => {
  const { readdir } = await import("node:fs/promises"),
    sharp = (await import("sharp")).default;
  const root = new URL("../../../public/assets/mockups/", import.meta.url),
    files = await readdir(root);
  assert.equal(files.filter((f) => f.endsWith(".webp")).length, 47);
  let bytes = 0;
  for (const file of files.filter((f) => f.endsWith(".webp"))) {
    const data = await readFile(new URL(file, root)),
      meta = await sharp(data).metadata();
    bytes += data.length;
    assert.equal(meta.format, "webp");
    assert.equal(meta.hasAlpha, true);
    assert.ok(meta.width! <= 1000 && meta.height! <= 1000);
  }
  assert.ok(bytes < 5 * 1024 * 1024);
});
