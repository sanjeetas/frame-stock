import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCardTemplate,
  createStudioDocument,
} from "../src/features/editor/studioTemplates.ts";
import { initialDesign } from "../src/features/editor/designDefaults.ts";

test("card templates contain independent editable front/back artwork; legacy designs migrate without losing image references", () => {
  const card = createCardTemplate("classic");
  assert.equal(card.width, 940);
  assert.equal(card.height, 580);
  card.pages.front.elements.find((element) => element.id === "company")!.text =
    "My company";
  assert.equal(
    card.pages.back.elements.find((element) => element.id === "back-company")!
      .text,
    "Company Name",
  );
  const legacy = createStudioDocument({
    ...initialDesign,
    baseProductId: "base",
    imageUploadId: "owned-photo",
    textX: 25,
    textY: 30,
    imageScale: 125,
  });
  assert.equal(
    legacy.pages.front.elements.find((element) => element.id === "headline")!
      .left,
    300,
  );
  assert.equal(
    legacy.pages.front.elements.find((element) => element.type === "image")!
      .uploadId,
    "owned-photo",
  );
  assert.deepEqual(
    createStudioDocument({ ...initialDesign, studio: card }),
    card,
  );
});

test("Fabric edits, transforms, front/back reloads and PNG exports preserve the studio document", async (t) => {
  let nodeFabric: typeof import("fabric/node");
  try {
    nodeFabric = await import("fabric/node");
  } catch {
    t.skip(
      "Optional native canvas is unavailable; browser build does not require it.",
    );
    return;
  }
  const fabric = await import("fabric");
  fabric.setEnv(nodeFabric.getEnv());
  const { renderStudioPage, readStudioPage, studioPreview } =
    await import("../src/features/editor/studioCanvas.ts");
  const document = createCardTemplate("classic");
  const canvas = new fabric.Canvas(undefined, { width: 940, height: 580 });
  try {
    await renderStudioPage(canvas, document, "front");
    const company = canvas
      .getObjects()
      .find(
        (object) => (object as any).studioElement?.id === "company",
      ) as InstanceType<typeof fabric.Textbox>;
    assert.ok(company instanceof fabric.Textbox);
    canvas.setActiveObject(company);
    company.enterEditing();
    assert.equal(
      company.hiddenTextarea?.parentNode,
      canvas.getElement().parentElement,
    );
    company.exitEditing();
    company.set({
      text: "Editable company",
      left: 430,
      top: 150,
      angle: 12,
      fontWeight: "bold",
      fontSize: 39,
      scaleX: 1.2,
      scaleY: 1.2,
    });
    company.initDimensions();
    company.setCoords();
    document.pages.front = readStudioPage(canvas);
    const saved = document.pages.front.elements.find(
      (element) => element.id === "company",
    )!;
    assert.equal(saved.text, "Editable company");
    assert.equal(saved.angle, 12);
    assert.equal(saved.fontSize, 39);
    assert.equal(saved.scaleX, 1.2);
    const backBefore = JSON.stringify(document.pages.back);
    await renderStudioPage(canvas, document, "back");
    assert.equal(JSON.stringify(document.pages.back), backBefore);
    await renderStudioPage(canvas, document, "front");
    const reloaded = canvas
      .getObjects()
      .find(
        (object) => (object as any).studioElement?.id === "company",
      ) as InstanceType<typeof fabric.Textbox>;
    assert.equal(reloaded.text, "Editable company");
    assert.equal(reloaded.left, 430);
    assert.equal(reloaded.angle, 12);
    const previousCount = canvas.getObjects().length;
    const broken = structuredClone(document);
    broken.pages.back.elements = [
      {
        id: "missing-photo",
        type: "image",
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        fill: "#000000",
        opacity: 1,
        locked: false,
        uploadId: "000000000000000000000000",
      },
    ];
    await assert.rejects(() => renderStudioPage(canvas, broken, "back"));
    assert.equal(canvas.getObjects().length, previousCount);
    assert.equal(
      (
        canvas
          .getObjects()
          .find(
            (object) => (object as any).studioElement?.id === "company",
          ) as InstanceType<typeof fabric.Textbox>
      ).text,
      "Editable company",
    );
    const png = await studioPreview(document, "front");
    assert.ok(png.startsWith("data:image/png;base64,iVBOR"));
    const sharp = (await import("sharp")).default;
    const info = await sharp(
      Buffer.from(png.split(",")[1]!, "base64"),
    ).metadata();
    assert.equal(info.width, 1880);
    assert.equal(info.height, 1160);
  } finally {
    await canvas.dispose();
  }
});

test("orientation changes preserve both pages and review flags placeholders and unsafe text", async () => {
  const { resizeStudio, artworkWarnings } =
    await import("../src/features/editor/studioActions.ts");
  const card = createCardTemplate("classic");
  const portrait = resizeStudio(card, 580, 940);
  assert.equal(portrait.width, 580);
  assert.equal(portrait.height, 940);
  assert.equal(
    portrait.pages.front.elements.length,
    card.pages.front.elements.length,
  );
  assert.equal(
    portrait.pages.back.elements.length,
    card.pages.back.elements.length,
  );
  const company = card.pages.front.elements.find(
    (element) => element.id === "company",
  )!;
  const portraitCompany = portrait.pages.front.elements.find(
    (element) => element.id === "company",
  )!;
  assert.equal(portraitCompany.left, (company.left * 580) / 940);
  assert.ok(
    artworkWarnings(card).some((message) => message.includes("placeholder")),
  );
  const unsafe = structuredClone(card);
  unsafe.pages.front.elements = [
    { ...company, text: "Real company", left: 0, top: 0 },
  ];
  unsafe.pages.back.elements = [];
  assert.ok(
    artworkWarnings(unsafe).some((message) => message.includes("safety area")),
  );
});

test("image crop renders the chosen region and crop/flip/effects survive serialization", async (t) => {
  let nodeFabric: typeof import("fabric/node");
  try {
    nodeFabric = await import("fabric/node");
  } catch {
    t.skip("Optional native canvas is unavailable");
    return;
  }
  const fabric = await import("fabric");
  fabric.setEnv(nodeFabric.getEnv());
  const { createStudioImage, readStudioObject, buildStudioObject } =
    await import("../src/features/editor/studioCanvas.ts");
  const { element } = await import("../src/features/editor/studioTypes.ts");
  const source = fabric.getEnv().document.createElement("canvas");
  source.width = 200;
  source.height = 100;
  const ctx = source.getContext("2d")!;
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = "#0000ff";
  ctx.fillRect(100, 0, 100, 100);
  const scene = element("image", {
    left: 50,
    top: 50,
    width: 100,
    height: 100,
    uploadId: "000000000000000000000000",
    crop: { x: 0.5, y: 0, width: 0.5, height: 1 },
    flipX: true,
  });
  const canvas = new fabric.StaticCanvas(undefined, {
    width: 100,
    height: 100,
  });
  try {
    const image = createStudioImage(source, scene);
    canvas.add(image);
    const sharp = (await import("sharp")).default;
    const png = canvas.toDataURL({ format: "png" });
    const stats = await sharp(
      Buffer.from(png.split(",")[1]!, "base64"),
    ).stats();
    assert.ok(stats.channels[2]!.mean > 250);
    assert.ok(stats.channels[0]!.mean < 1);
    const stored = readStudioObject(image)!;
    assert.equal(stored.crop!.x, 0.5);
    assert.equal(stored.flipX, true);
    const reloaded = createStudioImage(source, stored);
    assert.equal(reloaded.cropX, 100);
    assert.equal(reloaded.scaleX, image.scaleX);
    const text = await buildStudioObject(
      element("text", {
        text: "Shadow",
        charSpacing: 120,
        shadow: { color: "#000000", blur: 12, offsetX: 2, offsetY: 3 },
      }),
      canvas,
    );
    const effect = readStudioObject(text)!;
    assert.equal(effect.charSpacing, 120);
    assert.equal(effect.shadow!.blur, 12);
  } finally {
    await canvas.dispose();
  }
});

test("product specifications drive card shapes, product colours, print areas and persistent front/back artwork", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createProductSettings } =
    await import("../src/features/editor/studioTemplates.ts");
  const catalog = JSON.parse(
    await readFile(
      new URL("../../../public/custom-products.json", import.meta.url),
      "utf8",
    ),
  );
  const card = catalog.products.find(
    (p: any) => p.title === "Square Visiting Cards",
  );
  const configured = createProductSettings(
    { ...card, id: "test-card" },
    { sides: "Front and back" },
  );
  assert.equal(configured.studio!.width, configured.studio!.height);
  assert.equal(configured.baseProductId, "test-card");
  assert.equal(configured.studio!.twoSided, true);
  const shirt = catalog.products.find(
    (p: any) => p.title === "Men's Cotton T-Shirts",
  );
  const tshirt = createProductSettings(
    { ...shirt, id: "shirt-id" },
    { colour: "Navy", size: "XL" },
  );
  assert.equal(tshirt.baseProductId, "shirt-id");
  assert.equal(tshirt.studio!.productColour, "#153752");
  assert.ok(tshirt.studio!.printArea);
  assert.equal(tshirt.studio!.twoSided, true);
  const approved = { ...tshirt, artworkApproved: true };
  const updated = createProductSettings(
    { ...shirt, id: "shirt-id" },
    { colour: "White", size: "M" },
    approved,
  );
  assert.equal(updated.artworkApproved, false);
  assert.equal(updated.productOptions!.size, "M");
  assert.equal(approved.productOptions!.size, "XL");
  assert.equal(updated.studio!.productColour, "#ffffff");
  const frame = catalog.products.find((p: any) => p.title === "Photo Magnets");
  const base = createProductSettings(frame, { orientation: "Square" });
  const landscape = createProductSettings(
    frame,
    { orientation: "Landscape" },
    base,
  );
  assert.equal(landscape.studio!.width, 1200);
  assert.equal(landscape.studio!.height, 900);
  assert.equal(
    createProductSettings(frame, { orientation: "Square" }, landscape).studio!
      .width,
    1000,
  );
});

test("print-area clipping trims exported product artwork while preserving editable object positions", async (t) => {
  let fabric: typeof import("fabric/node");
  try {
    fabric = await import("fabric/node");
  } catch {
    t.skip("Optional native canvas unavailable");
    return;
  }
  const { applyStudioClip } =
    await import("../src/features/editor/studioCanvas.ts");
  const canvas = new fabric.StaticCanvas(undefined, {
    width: 400,
    height: 400,
    backgroundColor: "#ffffff",
  });
  const scene = {
    ...createCardTemplate(),
    format: "product" as const,
    width: 400,
    height: 400,
    printArea: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
  };
  const rect = new fabric.Rect({
    left: 0,
    top: 0,
    originX: "left",
    originY: "top",
    width: 400,
    height: 400,
    fill: "#ff0000",
  });
  // Canvas and clipping paths must use the same Fabric runtime in the native test.
  const browserFabric = await import("fabric");
  browserFabric.setEnv(fabric.getEnv());
  applyStudioClip(rect, scene);
  canvas.add(rect);
  canvas.renderAll();
  const ctx = canvas.getContext();
  assert.deepEqual(
    [...ctx.getImageData(20, 20, 1, 1).data].slice(0, 3),
    [255, 255, 255],
  );
  assert.deepEqual(
    [...ctx.getImageData(200, 200, 1, 1).data].slice(0, 3),
    [255, 0, 0],
  );
  assert.equal(rect.left, 0);
  await canvas.dispose();
});

test("magnet and other product editors retain the selected product identity", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createProductSettings } =
    await import("../src/features/editor/studioTemplates.ts");
  const catalogue = JSON.parse(
    await readFile(
      new URL("../../../public/custom-products.json", import.meta.url),
      "utf8",
    ),
  );
  for (const title of [
    "Photo Magnets",
    "Men's Cotton T-Shirts",
    "Square Visiting Cards",
  ]) {
    const product = catalogue.products.find((p: any) => p.title === title);
    assert.ok(product, title);
    const settings = createProductSettings(
      { ...product, id: "selected-product" },
      {},
    );
    assert.equal(settings.baseProductId, "selected-product", title);
    const reopened = createProductSettings(
      { ...product, id: "selected-product" },
      {},
      settings,
    );
    assert.equal(reopened.baseProductId, "selected-product");
    assert.deepEqual(reopened.studio!.pages, settings.studio!.pages);
  }
});

test("single magnet renders without a fridge or a scene request; editing and export preserve only customer layers", async () => {
  const native = await import("fabric/node");
  const fabric = await import("fabric");
  fabric.setEnv(native.getEnv());
  const { readFile } = await import("node:fs/promises");
  const { createProductSettings } =
    await import("../src/features/editor/studioTemplates.ts");
  const { renderStudioPage, readStudioPage, studioPreview } =
    await import("../src/features/editor/studioCanvas.ts");
  const products = JSON.parse(
    await readFile(
      new URL("../../../public/custom-products.json", import.meta.url),
      "utf8",
    ),
  ).products;
  const photo = products.find((p: any) => p.title === "Photo Magnets");
  const configured = createProductSettings(
    { ...photo, id: "single-magnet" },
    { shape: "Rounded corners" },
  );
  const doc = configured.studio!;
  assert.equal(doc.surface, "magnet");
  assert.equal(doc.shape, "rounded");
  assert.equal(
    doc.pages.front.elements.filter((e) => e.id === "magnet-photo-placeholder")
      .length,
    1,
  );
  const canvas = new fabric.Canvas(undefined);
  const fetchBefore = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Single magnet must not load a fridge scene");
  };
  try {
    await renderStudioPage(canvas, doc, "front", configured.baseProductId);
    assert.equal(canvas.getObjects().filter((o) => !o.selectable).length, 2);
    const bounds = canvas.getObjects()[1]!.getBoundingRect();
    assert.equal(bounds.left, doc.width * 0.08);
    assert.equal(bounds.top, doc.height * 0.08);
    const caption = canvas
      .getObjects()
      .find(
        (o) => (o as any).studioElement?.id === "magnet-caption",
      ) as InstanceType<typeof fabric.Textbox>;
    caption.set({ text: "My new caption", left: 410, top: 760 });
    caption.setCoords();
    const page = readStudioPage(canvas);
    assert.equal(page.background, "#ffffff");
    assert.equal(page.elements.length, doc.pages.front.elements.length);
    assert.equal(
      page.elements.find((e) => e.id === "magnet-caption")!.text,
      "My new caption",
    );
    doc.pages.front = page;
    await renderStudioPage(
      canvas,
      doc,
      "front",
      configured.baseProductId,
      false,
      "artwork",
    );
    assert.equal(canvas.getObjects().length, page.elements.length);
    await renderStudioPage(canvas, doc, "front", configured.baseProductId);
    assert.equal(
      readStudioPage(canvas).elements.find((e) => e.id === "magnet-caption")!
        .left,
      410,
    );
    assert.match(
      await studioPreview(doc, "front", configured.baseProductId),
      /^data:image\/png;base64,/,
    );
  } finally {
    globalThis.fetch = fetchBefore;
    await canvas.dispose();
  }
});

test("magnet gallery filters and photo-slot layouts preserve customer image ownership and captions", async () => {
  const {
    magnetTemplates,
    filterMagnetTemplates,
    magnetTemplate,
    applyMagnetLayout,
    isMagnetPhotoSlot,
    magnetPhotoTarget,
  } = await import("../src/features/editor/magnetTemplate.ts");
  assert.equal(filterMagnetTemplates("2").length, 1);
  assert.equal(filterMagnetTemplates("2", "Blue").length, 0);
  assert.equal(
    filterMagnetTemplates("all", "Blue", "Bold & Colourful").length,
    2,
  );
  for (const template of magnetTemplates) {
    const page = magnetTemplate(1000, 1000, template.id);
    assert.equal(
      page.elements.filter((e) => isMagnetPhotoSlot(e.id)).length,
      template.photos,
    );
    assert.equal(
      new Set(page.elements.map((e) => e.id)).size,
      page.elements.length,
    );
    for (const slot of page.elements.filter((e) => isMagnetPhotoSlot(e.id))) {
      assert.ok(slot.left - slot.width / 2 >= 80);
      assert.ok(slot.left + slot.width / 2 <= 920);
      assert.ok(slot.top - slot.height / 2 >= 80);
      assert.ok(slot.top + slot.height / 2 <= 920);
    }
  }
  assert.equal(
    magnetPhotoTarget("magnet-photo-label-2"),
    "magnet-photo-placeholder-2",
  );
  assert.equal(magnetPhotoTarget("untrusted-photo"), undefined);
  const { element } = await import("../src/features/editor/studioTypes.ts");
  const original = {
    version: 1 as const,
    format: "product" as const,
    surface: "magnet" as const,
    width: 1000,
    height: 1000,
    template: "photo-caption",
    pages: {
      front: magnetTemplate(1000, 1000),
      back: { background: "#ffffff", elements: [] },
    },
  };
  original.pages.front.elements = [
    element("image", {
      uploadId: "012345678901234567890123",
      width: 600,
      height: 500,
      crop: { x: 0.1, y: 0, width: 0.8, height: 1 },
    }),
    element("text", { id: "magnet-caption", text: "My family" }),
  ];
  const next = applyMagnetLayout(original, "two-moments");
  const photo = next.pages.front.elements.find((e) => e.type === "image")!;
  assert.equal(photo.uploadId, "012345678901234567890123");
  assert.deepEqual(photo.crop, original.pages.front.elements[0]!.crop);
  assert.equal(photo.id, "magnet-photo-placeholder");
  assert.equal(
    next.pages.front.elements.filter(
      (e) => e.type === "rect" && isMagnetPhotoSlot(e.id),
    ).length,
    1,
  );
  assert.equal(
    next.pages.front.elements.some((e) => e.id === "magnet-photo-label"),
    false,
  );
  assert.equal(
    next.pages.front.elements.find((e) => e.id === "magnet-caption")!.text,
    "My family",
  );
  assert.equal(original.pages.front.elements[0]!.id === photo.id, false);
});

test("magnet search, saved favourites and calendar years use real data", async () => {
  const { filterMagnetTemplates, calendarMonthText, magnetTemplate } =
    await import("../src/features/editor/magnetTemplate.ts");
  const { parseMagnetFavourites } =
    await import("../src/features/editor/magnetFavourites.ts");
  assert.equal(
    filterMagnetTemplates("all", "all", "all", "  CALENDAR ").length,
    2,
  );
  assert.equal(
    filterMagnetTemplates("1", "Green", "Minimal", "calendar").length,
    1,
  );
  assert.deepEqual(filterMagnetTemplates("0", "all", "all", "calendar"), []);
  assert.deepEqual(
    parseMagnetFavourites(
      '["photo-caption","invalid",null,"photo-caption","calendar-gold"]',
    ),
    ["photo-caption", "calendar-gold"],
  );
  for (const input of [null, "broken json", "{}", '"photo-caption"'])
    assert.deepEqual(parseMagnetFavourites(input), []);
  const feb = calendarMonthText(2028, 1);
  assert.match(feb, /29/);
  assert.doesNotMatch(calendarMonthText(2027, 1), /29/);
  assert.equal(
    calendarMonthText(2027, 0).split("\n")[2],
    "             1  2  3",
  );
  const page = magnetTemplate(1200, 900, "calendar-gold", 2028);
  assert.equal(
    page.elements.find((e) => e.id === "calendar-year")!.text,
    "2028",
  );
  assert.equal(
    page.elements.filter((e) => e.id.startsWith("calendar-month-")).length,
    12,
  );
  assert.match(
    page.elements.find((e) => e.id === "calendar-month-1")!.text!,
    /29/,
  );
  assert.ok(page.elements.length <= 40);
});
