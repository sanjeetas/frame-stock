import {
  getEnv,
  filters,
  Canvas,
  StaticCanvas,
  Textbox,
  Rect,
  Circle,
  FabricImage,
  Shadow,
  Ellipse,
  type FabricObject,
} from "fabric";
import { cropPixels } from "./studioActions";
import type {
  StudioDocument,
  StudioElement,
  StudioPage,
  StudioSide,
} from "./studioTypes";
import { api } from "../../lib/api";
import { apiBase, asset } from "../../lib/utils";
export type StudioObject = FabricObject & { studioElement?: StudioElement };
const imageCache = new Map<string, Promise<HTMLImageElement>>();
async function imageElement(
  productId?: string,
  uploadId?: string,
  mockupImage?: string,
) {
  const key = mockupImage
    ? `mockup:${mockupImage}`
    : productId
      ? `product:${productId}`
      : `upload:${uploadId}`;
  const load = async () => {
    if (uploadId) await api("/auth/me");
    const response = await fetch(
      mockupImage
        ? asset(mockupImage)
        : apiBase +
            (uploadId
              ? "/design-images/" + uploadId
              : "/products/" + productId + "/preview"),
      { credentials: "include" },
    );
    if (!response.ok)
      throw Error(
        "Image could not be loaded. Try again or choose another image.",
      );
    const objectUrl = URL.createObjectURL(await response.blob());
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      return image;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };
  // Private uploads always use the current session; only public product previews are cached.
  if (uploadId) return load();
  if (imageCache.size >= 12 && !imageCache.has(key))
    imageCache.delete(imageCache.keys().next().value!);
  if (!imageCache.has(key))
    imageCache.set(
      key,
      load().catch((error) => {
        imageCache.delete(key);
        throw error;
      }),
    );
  return imageCache.get(key)!;
}
export function createStudioImage(
  image: HTMLImageElement | HTMLCanvasElement,
  element: StudioElement,
  options: Record<string, unknown> = {},
) {
  const naturalWidth = (image as HTMLImageElement).naturalWidth || image.width,
    naturalHeight = (image as HTMLImageElement).naturalHeight || image.height;
  const region = cropPixels(naturalWidth, naturalHeight, element.crop);
  const object = new FabricImage(image, {
    ...options,
    left: element.left,
    top: element.top,
    originX: "center",
    originY: "center",
    ...region,
    flipX: element.flipX || false,
    flipY: element.flipY || false,
  });
  const fit = Math.min(
    element.width / region.width,
    element.height / region.height,
  );
  object.scaleX = element.scaleX * fit;
  object.scaleY = element.scaleY * fit;
  (object as StudioObject).studioElement = element;
  return object as StudioObject;
}
export async function buildStudioObject(
  element: StudioElement,
  canvas: StaticCanvas,
): Promise<StudioObject> {
  const options = {
    left: element.left,
    top: element.top,
    originX: "center" as const,
    originY: "center" as const,
    width: element.width,
    height: element.height,
    scaleX: element.scaleX,
    scaleY: element.scaleY,
    angle: element.angle,
    fill: element.fill,
    opacity: element.opacity,
    flipX: element.flipX || false,
    flipY: element.flipY || false,
    shadow: element.shadow ? new Shadow(element.shadow) : undefined,
    lockMovementX: element.locked,
    lockMovementY: element.locked,
    lockScalingX: element.locked,
    lockScalingY: element.locked,
    lockRotation: element.locked,
    lockSkewingX: true,
    lockSkewingY: true,
    lockScalingFlip: true,
    hasControls: !element.locked,
    borderColor: "#00a8d5",
    cornerColor: "#00a8d5",
    cornerStrokeColor: "#fff",
    transparentCorners: false,
    cornerSize: 10,
  };
  let object: StudioObject;
  if (element.type === "text")
    object = new Textbox(element.text || "", {
      ...options,
      fontFamily: element.fontFamily || "Arial",
      fontSize: element.fontSize || 32,
      fontWeight: element.fontWeight || "normal",
      fontStyle: element.fontStyle || "normal",
      underline: element.underline || false,
      textAlign: element.textAlign || "left",
      lineHeight: element.lineHeight || 1.16,
      charSpacing: element.charSpacing || 0,
      editable: !element.locked,
      splitByGrapheme: true,
      hiddenTextareaContainer: canvas.getElement().parentElement,
    });
  else if (element.type === "image") {
    const image = await imageElement(element.productId, element.uploadId);
    object = createStudioImage(image, element, options);
  } else if (element.type === "circle")
    object = new Circle({ ...options, radius: element.width / 2 });
  else object = new Rect(options);
  object.studioElement = element;
  return object;
}
export function readStudioObject(object: StudioObject): StudioElement | null {
  const data = object.studioElement;
  if (!data) return null;
  const item = {
    ...data,
    left: object.left,
    top: object.top,
    width: Math.max(1, object.width),
    height: Math.max(1, object.height),
    scaleX: Math.max(0.01, Math.abs(object.scaleX)),
    scaleY: Math.max(0.01, Math.abs(object.scaleY)),
    angle: object.angle % 360,
    fill:
      typeof object.fill === "string" && /^#[a-f\d]{6}$/i.test(object.fill)
        ? object.fill
        : data.fill,
    opacity: object.opacity,
    locked: object.lockMovementX,
    flipX: object.flipX,
    flipY: object.flipY,
    shadow: object.shadow
      ? {
          color: object.shadow.color,
          blur: object.shadow.blur,
          offsetX: object.shadow.offsetX,
          offsetY: object.shadow.offsetY,
        }
      : undefined,
  };
  if (object instanceof Textbox)
    Object.assign(item, {
      text: object.text.slice(0, 500),
      fontFamily: object.fontFamily,
      fontSize: object.fontSize,
      fontWeight: object.fontWeight,
      fontStyle: object.fontStyle,
      underline: object.underline,
      textAlign: object.textAlign,
      lineHeight: object.lineHeight,
      charSpacing: object.charSpacing,
    });
  return item;
}
export function readStudioPage(canvas: Canvas): StudioPage {
  return {
    background:
      typeof canvas.backgroundColor === "string"
        ? canvas.backgroundColor
        : "#ffffff",
    elements: canvas
      .getObjects()
      .map((object) => readStudioObject(object as StudioObject))
      .filter((element): element is StudioElement => !!element),
  };
}
export async function renderStudioPage(
  canvas: StaticCanvas,
  document: StudioDocument,
  side: StudioSide,
  baseProductId?: string,
  watermark = false,
  view: "product" | "artwork" = "product",
) {
  const page = document.pages[side];
  let background: FabricImage | undefined;
  if (
    document.mockupImage &&
    document.format === "product" &&
    document.surface !== "magnet" &&
    view === "product"
  ) {
    const source = await imageElement(
      undefined,
      undefined,
      document.mockupImage,
    );
    const image = new FabricImage(source, {
      selectable: false,
      evented: false,
      originX: "center",
      originY: "center",
      left: document.width / 2,
      top: document.height / 2,
    });
    const ratio = Math.min(
      document.width / source.naturalWidth,
      document.height / source.naturalHeight,
    );
    if (document.productColour) {
      image.filters = [
        new filters.BlendColor({
          color: document.productColour,
          mode: "multiply",
          alpha: 1,
        }),
      ];
      image.applyFilters();
    }
    image.scale(ratio);
    background = image;
  }
  const objects = await Promise.all(
    page.elements.map((element) => buildStudioObject(element, canvas)),
  );
  // Do not discard the previous artwork until every referenced image is ready.
  canvas.clear();
  canvas.setDimensions({ width: document.width, height: document.height });
  canvas.backgroundColor = page.background;
  if (document.surface === "magnet" && view === "product") {
    // Keep workspace furniture outside the persisted artwork layers.
    canvas.add(
      new Rect({
        left: 0,
        top: 0,
        width: document.width,
        height: document.height,
        originX: "left",
        originY: "top",
        fill: "#edf1f5",
        selectable: false,
        evented: false,
      }),
    );
    const area = document.printArea || {
      x: 0.08,
      y: 0.08,
      width: 0.84,
      height: 0.84,
    };
    const options = {
      left: area.x * document.width,
      top: area.y * document.height,
      width: area.width * document.width,
      height: area.height * document.height,
      originX: "left" as const,
      originY: "top" as const,
      fill: page.background,
      stroke: "#cbd5e1",
      strokeWidth: 2,
      selectable: false,
      evented: false,
      shadow: new Shadow({ color: "#10375926", blur: 16, offsetY: 8 }),
    };
    canvas.add(
      document.shape === "circle" || document.shape === "oval"
        ? new Ellipse({
            ...options,
            rx: options.width / 2,
            ry: options.height / 2,
          })
        : new Rect({
            ...options,
            rx: document.shape === "rounded" ? 35 : 0,
            ry: document.shape === "rounded" ? 35 : 0,
          }),
    );
  }
  if (background) canvas.add(background);
  for (const object of objects) applyStudioClip(object, document);
  canvas.add(...objects);
  if (watermark)
    for (let y = 20; y < document.height + 100; y += 130)
      for (let x = -100; x < document.width; x += 300)
        canvas.add(
          new Textbox("PHULO PREVIEW", {
            left: x,
            top: y,
            width: 280,
            fontFamily: "Arial",
            fontSize: 20,
            fill: "#36546b",
            opacity: 0.16,
            angle: -20,
            selectable: false,
            evented: false,
          }),
        );
  canvas.requestRenderAll();
}
export async function studioPreview(
  document: StudioDocument,
  side: StudioSide,
  baseProductId?: string,
  view: "product" | "artwork" = "product",
) {
  const canvas = new StaticCanvas(getEnv().document.createElement("canvas"));
  try {
    await renderStudioPage(canvas, document, side, baseProductId, true, view);
    return canvas.toDataURL({ format: "png", multiplier: 2 });
  } finally {
    await canvas.dispose();
  }
}

export function applyStudioClip(
  object: StudioObject,
  document: StudioDocument,
) {
  const area = document.printArea;
  if (!area && !document.shape) return;
  const left = area ? area.x * document.width : 0;
  const top = area ? area.y * document.height : 0;
  const width = area ? area.width * document.width : document.width;
  const height = area ? area.height * document.height : document.height;
  const common = {
    left,
    top,
    width,
    height,
    originX: "left" as const,
    originY: "top" as const,
    absolutePositioned: true,
    fill: "#000000",
  };
  object.clipPath =
    document.shape === "circle" || document.shape === "oval"
      ? new Ellipse({ ...common, rx: width / 2, ry: height / 2 })
      : new Rect({
          ...common,
          rx: document.shape === "rounded" ? 35 : 0,
          ry: document.shape === "rounded" ? 35 : 0,
        });
}
