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
