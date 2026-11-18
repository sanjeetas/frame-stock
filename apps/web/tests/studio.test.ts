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
  assert.equal(configured.baseProductId, undefined);
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
