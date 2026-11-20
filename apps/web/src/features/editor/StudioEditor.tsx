import { ProductOptions } from "./ProductOptions";
import { ProductVariations } from "./ProductVariations";
import { productVariation, isProductPhotoSlot } from "./productVariationTemplates";
import {
  applyMagnetLayout,
  isMagnetPhotoSlot,
  magnetPhotoTarget,
} from "./magnetTemplate";
import { MagnetTemplates } from "./MagnetTemplates";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, Textbox, Shadow } from "fabric";
import {
  Save,
  Undo2,
  Redo2,
  Eye,
  Type,
  Upload,
  Shapes,
  Palette,
  LayoutTemplate,
  Layers,
  Plus,
  Minus,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Download,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  X,
  MoreHorizontal,
  Settings,
  Folder,
  ChevronDown,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Price } from "../catalog/Price";
import { useAuth } from "../auth/AuthProvider";
import { useApiQuery } from "../../hooks/useApiQuery";
import { api } from "../../lib/api";
import { StudioReview } from "./StudioReview";
import { StudioMorePanel } from "./StudioMorePanel";
import { safeMargin, resizeStudio, printedSides } from "./studioActions";
import { apiBase } from "../../lib/utils";
import { asset } from "../../lib/utils";
import type { Design, DesignSettings, Product } from "../../types";
import { StudioPreview } from "./StudioPreview";
import { initialDesign } from "./designDefaults";
import {
  createCardTemplate,
  createProductSettings,
  createStudioDocument,
  studioTemplates,
} from "./studioTemplates";
import {
  element,
  type StudioDocument,
  type StudioElement,
  type StudioSide,
} from "./studioTypes";
import {
  buildStudioObject,
  applyStudioClip,
  readStudioObject,
  readStudioPage,
  renderStudioPage,
  studioPreview,
  type StudioObject,
} from "./studioCanvas";

interface Props {
  startInEditor?: boolean;
  initial?: DesignSettings;
  existingId?: string;
  product?: Product;
  onApply?: (settings: DesignSettings) => void;
  onSaved?: () => void;
  onSignIn: () => void;
  onClose: () => void;
}
type Tab =
  | "product"
  | "text"
  | "uploads"
  | "graphics"
  | "background"
  | "templates"
  | "colours"
  | "layers"
  | "more";
const tools: { tab: Tab; label: string; icon: typeof Type }[] = [
  { tab: "product", label: "Product", icon: Layers },
  { tab: "text", label: "Text", icon: Type },
  { tab: "uploads", label: "Uploads", icon: Upload },
  { tab: "graphics", label: "Graphics", icon: Shapes },
  { tab: "background", label: "Background", icon: Palette },
  { tab: "templates", label: "Templates", icon: LayoutTemplate },
  { tab: "colours", label: "Template colour", icon: Palette },
  { tab: "layers", label: "Layers", icon: Layers },
  { tab: "more", label: "More", icon: MoreHorizontal },
];
function ToolButton({
  label,
  children,
  onClick,
  disabled = false,
  pressed,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={
        "flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-35 " +
        (pressed ? "bg-cyan-100 text-primary" : "hover:bg-slate-100")
      }
    >
      {children}
    </button>
  );
}
function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onCommit,
  className = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onCommit: (value: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      aria-label={label}
      type="number"
      min={min}
      max={max}
      step={step}
      className={className}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = Number(draft);
        if (draft !== "" && Number.isFinite(next) && next >= min && next <= max)
          onCommit(next);
        else setDraft(String(value));
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}
export default function StudioEditor({
  startInEditor,
  initial,
  existingId,
  product,
  onApply,
  onSaved,
  onSignIn,
  onClose,
}: Props) {
  const { user } = useAuth();
  const card =
    initial?.studio?.format === "card" ||
    /visiting.?card|business.?card/i.test(product?.title || "");
  const [document, setDocument] = useState(() =>
    createStudioDocument(
      product?.customisation && initial
        ? createProductSettings(product, initial.productOptions || {}, initial)
        : initial || initialDesign,
      card,
    ),
  );
  const selectedProductOptions =
    document.productOptions || initial?.productOptions || {};
  const twoSided = document.twoSided ?? document.format === "card";
  const documentRef = useRef(document);
  const [side, setSide] = useState<StudioSide>(
    initial?.productOptions?.sides === "Back only" ? "back" : "front",
  );
  const sideRef = useRef(side);
  sideRef.current = side;
  const [tab, setTab] = useState<Tab>(
      startInEditor
        ? "uploads"
        : card || document.surface === "magnet"
          ? "templates"
          : "text",
    ),
    [selected, setSelected] = useState<StudioElement | null>(null);
  const [node, setNode] = useState<HTMLCanvasElement | null>(null),
    [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<"product" | "artwork">("product");
  const [review, setReview] = useState(false),
    [bleed, setBleed] = useState(card),
    [rulers, setRulers] = useState(card);
  const [context, setContext] = useState<{ left: number; top: number } | null>(
      null,
    ),
    [clipboard, setClipboard] = useState<StudioElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null),
    uploadTarget = useRef<string | undefined>(undefined);
  const [savedId, setSavedId] = useState(existingId),
    [revision, setRevision] = useState(0),
    [zoom, setZoom] = useState(100),
    [preview, setPreview] = useState(false),
    [guides, setGuides] = useState(card || !!document.printArea);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const [thumbs, setThumbs] = useState<Partial<Record<StudioSide, string>>>({});
  const viewport = useRef<HTMLDivElement>(null),
    loadingRef = useRef(false),
    commitRef = useRef(() => {});
  const history = useRef([JSON.stringify(document)]),
    cursor = useRef(0);
  const [historyPosition, setHistoryPosition] = useState(0),
    [historyLength, setHistoryLength] = useState(1);
  const library = useApiQuery<Product[]>(
    tab === "uploads" ? "/library?limit=100" : null,
  );
  const ownUploads = useApiQuery<{ id: string; createdAt: string }[]>(
    tab === "uploads" && user ? "/design-images" : null,
  );
  const templatePreviews = useMemo(
    () =>
      Object.fromEntries(
        studioTemplates.map((template) => [
          template.id,
          { ...initialDesign, studio: createCardTemplate(template.id) },
        ]),
      ),
    [],
  );
  const textElements = document.pages[side].elements.filter(
    (item) =>
      item.type === "text" &&
      item.id !== "logo-label" &&
      item.id !== "product-photo-label" &&
      !item.id.startsWith("magnet-photo-label"),
  );
  const active = () => canvas?.getActiveObject() as StudioObject | undefined;
  const positionContext = useCallback((c: Canvas) => {
    const object = c.getActiveObject();
    if (!object) {
      setContext(null);
      return;
    }
    const bounds = object.getBoundingRect(),
      zoom = c.getZoom();
    setContext({
      left: Math.max(
        4,
        Math.min(
          c.getWidth() - 208,
          (bounds.left + bounds.width / 2) * zoom - 104,
        ),
      ),
      top: Math.max(4, bounds.top * zoom - 46),
    });
  }, []);
  const syncSelection = useCallback(
    (c: Canvas) => {
      setSelected(
        c.getActiveObject()
          ? readStudioObject(c.getActiveObject() as StudioObject)
          : null,
      );
      positionContext(c);
    },
    [positionContext],
  );
  function publish(next: StudioDocument, record = true) {
    documentRef.current = next;
    setDocument(next);
    setSuccess("");
    if (record) {
      const serialized = JSON.stringify(next);
      if (history.current[cursor.current] !== serialized) {
        history.current = history.current.slice(0, cursor.current + 1);
        history.current.push(serialized);
        if (history.current.length > 30) history.current.shift();
        cursor.current = history.current.length - 1;
        setHistoryPosition(cursor.current);
        setHistoryLength(history.current.length);
      }
    }
  }
  function commit() {
    if (!canvas || loadingRef.current) return;
    publish({
      ...documentRef.current,
      pages: {
        ...documentRef.current.pages,
        [sideRef.current]: readStudioPage(canvas),
      },
    });
    syncSelection(canvas);
    setThumbs((previous) => ({
      ...previous,
      [sideRef.current]: canvas.toDataURL({ format: "png", multiplier: 0.15 }),
    }));
  }
  commitRef.current = commit;
  useEffect(() => {
    if (!node) return;
    const c = new Canvas(node, {
      selection: false,
      selectionKey: null,
      preserveObjectStacking: true,
      backgroundColor: "#ffffff",
    });
    setCanvas(c);
    const select = () => syncSelection(c);
    const changed = () => {
      const target = c.getActiveObject();
      if (target instanceof Textbox && target.text.length > 500) {
        target.set("text", target.text.slice(0, 500));
        target.initDimensions();
      }
      commitRef.current();
    };
    c.on("selection:created", select);
    c.on("selection:updated", select);
    c.on("selection:cleared", select);
    c.on("object:modified", changed);
    c.on("text:changed", changed);
    c.on("object:moving", () => positionContext(c));
    c.on("object:scaling", () => positionContext(c));
    c.on("object:rotating", () => positionContext(c));
    c.on("mouse:dblclick", (event) => {
      const id = (event.target as StudioObject | undefined)?.studioElement?.id;
      if (id === "logo-placeholder" || id === "logo-label") {
        uploadTarget.current = id;
        setTab("uploads");
        fileInput.current?.click();
      }
    });
    return () => {
      setCanvas(null);
      void c.dispose();
    };
  }, [node, syncSelection, positionContext]);
  useEffect(() => {
    if (!canvas) return;
    let mounted = true;
    let loaded = false;
    loadingRef.current = true;
    canvas.skipTargetFind = true;
    canvas.discardActiveObject();
    setLoadFailed(false);
    setLoading(true);
    setError("");
    setSelected(null);
    renderStudioPage(
      canvas,
      documentRef.current,
      side,
      initial?.baseProductId,
      false,
      view,
    )
      .then(() => {
        if (mounted) {
          loaded = true;
          setThumbs((previous) => ({
            ...previous,
            [side]: canvas.toDataURL({ format: "png", multiplier: 0.15 }),
          }));
        }
      })
      .catch((error) => {
        if (mounted) {
          setLoadFailed(true);
          setError(error.message || "Canvas could not load.");
        }
      })
      .finally(() => {
        if (mounted) {
          loadingRef.current = !loaded;
          canvas.skipTargetFind = !loaded || previewRef.current;
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [canvas, side, revision, initial?.baseProductId, view]);
  useEffect(() => {
    if (!canvas || !viewport.current) return;
    const fit = () => {
      const container = viewport.current!;
      const scale =
        (Math.max(
          0.15,
          Math.min(
            (container.clientWidth - 70) / document.width,
            (container.clientHeight - 100) / document.height,
            1,
          ),
        ) *
          zoom) /
        100;
      canvas.setDimensions({
        width: Math.round(document.width * scale),
        height: Math.round(document.height * scale),
      });
      canvas.setZoom(scale);
      canvas.requestRenderAll();
      positionContext(canvas);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(viewport.current);
    fit();
    return () => observer.disconnect();
  }, [canvas, zoom, document.width, document.height, loading]);
  useEffect(() => {
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.skipTargetFind = preview || loadingRef.current;
    canvas.requestRenderAll();
  }, [canvas, preview]);
  function replace(next: StudioDocument, keepSide = false) {
    setThumbs({});
    publish(next);
    setSide(keepSide ? sideRef.current : printedSides(next)[0]!);
    setRevision((value) => value + 1);
  }
  function changeProductOptions(next: Record<string, string>) {
    if (!product) return;
    commit();
    const configured = createProductSettings(product, next, savedSettings());
    replace(configured.studio!, true);
  }
  function travel(direction: number) {
    if (busy || loadingRef.current) return;
    const next = cursor.current + direction;
    if (next < 0 || next >= history.current.length) return;
    cursor.current = next;
    setThumbs({});
    publish(JSON.parse(history.current[next]!), false);
    setHistoryPosition(next);
    setRevision((value) => value + 1);
  }
  async function add(item: StudioElement) {
    if (!canvas || loadingRef.current) return;
    if (documentRef.current.pages[side].elements.length >= 40) {
      setError("Maximum 40 elements per side. Remove an unused element first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const area = documentRef.current.printArea;
      if (
        area &&
        item.left === document.width / 2 &&
        item.top === document.height / 2
      ) {
        item = {
          ...item,
          left: (area.x + area.width / 2) * document.width,
          top: (area.y + area.height / 2) * document.height,
          width: Math.min(item.width, area.width * document.width * 0.9),
          ...(item.type === "image"
            ? {
                height: Math.min(
                  item.height,
                  area.height * document.height * 0.9,
                ),
              }
            : {}),
        };
      }
      const object = await buildStudioObject(item, canvas);
      applyStudioClip(object, documentRef.current);
      canvas.add(object);
      canvas.setActiveObject(object);
      canvas.requestRenderAll();
      commit();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function updateObject(patch: Record<string, unknown>, id?: string) {
    if (!canvas || loadingRef.current) return;
    const object = id
      ? (canvas
          .getObjects()
          .find(
            (object) => (object as StudioObject).studioElement?.id === id,
          ) as StudioObject | undefined)
      : active();
    if (!object) return;
    object.set(patch);
    if (object instanceof Textbox) object.initDimensions();
    object.setCoords();
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    commit();
  }
  function addText() {
    setTab("text");
    void add(
      element("text", {
        left: document.width / 2,
        top: document.height / 2,
        width: document.width * 0.55,
        height: 60,
        text: "Add your text",
        fontFamily: "Arial",
        fontSize: 36,
        fontWeight: "normal",
        fontStyle: "normal",
        textAlign: "left",
        underline: false,
        lineHeight: 1.16,
      }),
    );
  }
  function remove() {
    const object = active();
    if (!canvas || !object) return;
    canvas.remove(object);
    canvas.discardActiveObject();
    commit();
  }
  function duplicate() {
    const object = active();
    if (!object) return;
    const item = readStudioObject(object);
    if (item)
      void add({
        ...item,
        id: crypto.randomUUID(),
        left: item.left + 20,
        top: item.top + 20,
      });
  }
  function toggleLock() {
    const object = active();
    if (!object) return;
    const locked = !object.lockMovementX;
    updateObject({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      hasControls: !locked,
      ...(object instanceof Textbox ? { editable: !locked } : {}),
    });
  }
  function applyTemplate(id: string) {
    setTab("text");
    if (document.surface === "magnet") {
      replace(applyMagnetLayout(documentRef.current, id));
    } else if (document.format === "card") {
      const next = resizeStudio(
        createCardTemplate(id),
        document.width,
        document.height,
      );
      replace({ ...document, pages: next.pages, template: id });
    } else {
      const theme = studioTemplates.find((item) => item.id === id)!;
      const next = createStudioDocument({
        ...initialDesign,
        ...initial,
        studio: undefined,
        headline: "Your design",
        subtitle: "Make it yours",
        fg: theme.color,
        bg: theme.background,
      });
      next.pages.front.elements = [
        ...document.pages.front.elements.filter(
          (item) => item.type === "image",
        ),
        ...next.pages.front.elements.filter((item) => item.type === "text"),
      ];
      const resized = resizeStudio(next, document.width, document.height);
      if (document.printArea) {
        const area = document.printArea;
        for (const page of Object.values(resized.pages))
          for (const item of page.elements)
            if (item.type === "text") {
              item.left = (area.x + area.width / 2) * document.width;
              item.top =
                (area.y + area.height * (item.id === "headline" ? 0.4 : 0.65)) *
                document.height;
              item.width = area.width * document.width * 0.9;
            }
      }
      replace({ ...document, pages: resized.pages, template: id });
    }
  }
  function savedSettings(): DesignSettings {
    const scene = documentRef.current;
    const labels = scene.pages[
      scene.productOptions?.sides === "Back only" ? "back" : "front"
    ].elements.filter(
      (item) =>
        item.type === "text" &&
        item.id !== "logo-label" &&
        item.id !== "product-photo-label" &&
        !item.id.startsWith("magnet-photo-label"),
    );
    return {
      ...initialDesign,
      ...initial,
      headline: (labels[0]?.text || "Your design").slice(0, 90),
      subtitle: (labels[1]?.text || "").slice(0, 140),
      imageUploadId: undefined,
      imageProductId: undefined,
      hasUploadedImage: scene.pages.front.elements.some(
        (item) => item.uploadId,
      ),
      productOptions:
        scene.surface === "magnet" &&
        (scene.productOptions || initial?.productOptions)?.orientation
          ? {
              ...(scene.productOptions || initial?.productOptions),
              orientation:
                scene.width > scene.height
                  ? "Landscape"
                  : scene.width < scene.height
                    ? "Portrait"
                    : "Square",
            }
          : scene.productOptions || initial?.productOptions,
      studio: scene,
      artworkApproved: false,
    };
  }
  async function save() {
    if (!user) {
      onSignIn();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const settings = savedSettings();
      const response = await api<Design>(
        savedId ? `/designs/${savedId}` : "/designs",
        {
          method: savedId ? "PATCH" : "POST",
          body: {
            title: settings.headline.slice(0, 100) || "Untitled design",
            settings,
          },
        },
      );
      setSavedId(response.data.id);
      setSuccess(
        documentRef.current.format === "card"
          ? "Front and back saved to My designs."
          : "Design saved to My designs.",
      );
      onSaved?.();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError("");
    try {
      const url = await studioPreview(
        documentRef.current,
        side,
        initial?.baseProductId,
        view,
      );
      const link = globalThis.document.createElement("a");
      link.href = url;
      link.download = `phulo-${side}-design-preview.png`;
      link.click();
    } catch (error) {
      setError((error as Error).message || "Preview export failed.");
    } finally {
      setBusy(false);
    }
  }
  function askUpload(replace = false) {
    if (isProductPhotoSlot(selected?.id)) {
      uploadTarget.current = "product-photo-placeholder";
      setTab("uploads");
      fileInput.current?.click();
      return;
    }
    uploadTarget.current =
      documentRef.current.surface === "magnet" &&
      magnetPhotoTarget(selected?.id)
        ? magnetPhotoTarget(selected?.id)
        : replace
          ? selected?.id
          : undefined;
    setTab("uploads");
    fileInput.current?.click();
  }
  async function placeAsset(
    source: { uploadId?: string; productId?: string },
    targetId?: string,
  ) {
    if (!canvas || loadingRef.current) return;
    setBusy(true);
    setError("");
    try {
      if (isProductPhotoSlot(targetId)) targetId = "product-photo-placeholder";
      if (!targetId)
        targetId = (
          canvas.getObjects().find((item) => {
            const el = (item as StudioObject).studioElement;
            return el?.type === "rect" && el.id === "product-photo-placeholder";
          }) as StudioObject | undefined
        )?.studioElement?.id;
      if (documentRef.current.surface === "magnet")
        targetId = magnetPhotoTarget(targetId) || targetId;
      if (!targetId && documentRef.current.surface === "magnet")
        targetId = (
          canvas.getObjects().find((item) => {
            const e = (item as StudioObject).studioElement;
            return e?.type === "rect" && isMagnetPhotoSlot(e.id);
          }) as StudioObject | undefined
        )?.studioElement?.id;
      let target = targetId
        ? (canvas
            .getObjects()
            .find(
              (item) => (item as StudioObject).studioElement?.id === targetId,
            ) as StudioObject | undefined)
        : undefined;
      const logo =
        target?.studioElement?.id === "logo-placeholder" ||
        target?.studioElement?.id === "logo-label";
      if (logo)
        target = canvas
          .getObjects()
          .find(
            (item) =>
              (item as StudioObject).studioElement?.id === "logo-placeholder",
          ) as StudioObject | undefined;
      if (!target) {
        await add(
          element("image", {
            left: document.width / 2,
            top: document.height / 2,
            width: document.width * 0.35,
            height: document.height * 0.5,
            ...source,
          }),
        );
        return;
      }
      const previous = readStudioObject(target)!;
      const item = element("image", {
        id: logo ? "customer-logo" : previous.id,
        left: previous.left,
        top: previous.top,
        width: target.getScaledWidth(),
        height: target.getScaledHeight(),
        angle: previous.angle,
        opacity: previous.opacity,
        ...source,
      });
      const replacement = await buildStudioObject(item, canvas),
        index = canvas.getObjects().indexOf(target);
      const magnetPhoto =
        isMagnetPhotoSlot(previous.id) || isProductPhotoSlot(previous.id);
      const obsolete = magnetPhoto
        ? canvas
            .getObjects()
            .filter((item) =>
              [
                previous.id,
                previous.id.replace("-placeholder", "-label"),
              ].includes((item as StudioObject).studioElement?.id || ""),
            )
        : logo
          ? canvas
              .getObjects()
              .filter((item) =>
                ["logo-placeholder", "logo-label"].includes(
                  (item as StudioObject).studioElement?.id || "",
                ),
              )
          : [target];
      applyStudioClip(replacement, documentRef.current);
      canvas.remove(...obsolete);
      canvas.insertAt(index, replacement);
      canvas.setActiveObject(replacement);
      canvas.requestRenderAll();
      commit();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function applyCrop(crop: NonNullable<StudioElement["crop"]>) {
    const target = active();
    if (!canvas || !target || target.studioElement?.type !== "image") return;
    setBusy(true);
    try {
      const previous = readStudioObject(target)!;
      const replacement = await buildStudioObject(
        {
          ...previous,
          width: target.getScaledWidth(),
          height: target.getScaledHeight(),
          scaleX: 1,
          scaleY: 1,
          crop,
        },
        canvas,
      );
      const index = canvas.getObjects().indexOf(target);
      canvas.remove(target);
      canvas.insertAt(index, replacement);
      canvas.setActiveObject(replacement);
      canvas.requestRenderAll();
      commit();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function alignElement(value: "left" | "right" | "top" | "bottom" | "center") {
    const target = active();
    if (!target || target.lockMovementX) return;
    const margin = safeMargin(document),
      bounds = target.getBoundingRect(),
      patch: Record<string, number> = {};
    if (value === "left") patch.left = target.left + margin - bounds.left;
    if (value === "right")
      patch.left =
        target.left + document.width - margin - bounds.left - bounds.width;
    if (value === "top") patch.top = target.top + margin - bounds.top;
    if (value === "bottom")
      patch.top =
        target.top + document.height - margin - bounds.top - bounds.height;
    if (value === "center") {
      patch.left = document.width / 2;
      patch.top = document.height / 2;
    }
    updateObject(patch);
  }
  function copyLayer() {
    const target = active();
    if (target) setClipboard(readStudioObject(target));
  }
  function pasteLayer() {
    if (clipboard)
      void add({
        ...clipboard,
        id: crypto.randomUUID(),
        left: clipboard.left + 20,
        top: clipboard.top + 20,
      });
  }
  function clearSide() {
    publish({
      ...document,
      pages: {
        ...document.pages,
        [side]: { ...document.pages[side], elements: [] },
      },
    });
    setRevision((value) => value + 1);
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    if (!user) {
      onSignIn();
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError("Choose a PNG, JPEG or WebP under 8 MB.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api<{ id: string }>("/design-images", {
        method: "POST",
        raw: file,
      });
      await placeAsset({ uploadId: response.data.id }, uploadTarget.current);
      uploadTarget.current = undefined;
      ownUploads.reload();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const browsingVariations =
    tab === "templates" &&
    (document.surface === "magnet" || !!product?.customisation);
  const selectedText = selected?.type === "text";
  const page = document.pages[side];
  return (
    <div
      className="studio-shell"
      data-studio
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (review) {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setReview(false);
          }
          return;
        }
        const command = event.ctrlKey || event.metaKey;
        if (command && event.key.toLowerCase() === "s") {
          event.preventDefault();
          void save();
          return;
        }
        if (
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.isContentEditable ||
          preview
        )
          return;
        if (command && event.key.toLowerCase() === "d") {
          event.preventDefault();
          duplicate();
          return;
        }
        if (command && event.key.toLowerCase() === "c") {
          event.preventDefault();
          copyLayer();
          return;
        }
        if (command && event.key.toLowerCase() === "v" && clipboard) {
          event.preventDefault();
          pasteLayer();
          return;
        }
        const direction = (
          {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
          } as Record<string, number[]>
        )[event.key];
        const object = active();
        if (direction && object && !object.lockMovementX) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          updateObject({
            left: object.left + direction[0] * step,
            top: object.top + direction[1] * step,
          });
          return;
        }
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "z"
        ) {
          event.preventDefault();
          travel(event.shiftKey ? 1 : -1);
        } else if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "y"
        ) {
          event.preventDefault();
          travel(1);
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          remove();
        }
      }}
    >
      <input
        ref={fileInput}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp"
        aria-label="Choose photo or logo"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <header className="studio-header" inert={review}>
        <img
          src={asset("assets/logo.png")}
          alt="PHULO Multi Graphics"
          className="h-12 w-24 object-contain"
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="flex max-w-full items-center gap-2 font-semibold"
            aria-label="Product settings"
            onClick={() => {
              setTab("product");
              setPreview(false);
            }}
          >
            <Folder size={20} />
            <span className="truncate">
              {product?.title ||
                (document.format === "card"
                  ? "Classic Visiting Cards"
                  : "Design Studio")}
            </span>
            <ChevronDown size={16} />
          </button>
          <p className="text-xs text-slate-500">
            {side === "front" ? "Front" : "Back"} artwork ·{" "}
            {document.specification ||
              (document.format === "card"
                ? `${document.width / 10} × ${document.height / 10} mm including bleed`
                : "Custom product proof")}
          </p>
        </div>
        {twoSided && (
          <select
            className="studio-mobile-side"
            aria-label="Artwork side"
            value={side}
            onChange={(event) => setSide(event.target.value as StudioSide)}
          >
            <option value="front">Front</option>
            <option value="back">Back</option>
          </select>
        )}
        <ToolButton
          label="Save design"
          onClick={() => void save()}
          disabled={busy || loading || loadFailed}
        >
          <Save size={22} />
        </ToolButton>
        <ToolButton
          label="Undo"
          onClick={() => travel(-1)}
          disabled={!historyPosition || loading || busy}
        >
          <Undo2 size={22} />
        </ToolButton>
        <ToolButton
          label="Redo"
          onClick={() => travel(1)}
          disabled={historyPosition >= historyLength - 1 || loading || busy}
        >
          <Redo2 size={22} />
        </ToolButton>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPreview((value) => !value)}
        >
          <Eye size={20} />
          {preview ? "Edit" : "Preview"}
        </Button>
        {product && (
          <span className="hidden font-semibold lg:block">
            <Price product={product} />
          </span>
        )}
        <Button
          className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
          size="sm"
          disabled={loading || busy || loadFailed}
          onClick={() => {
            if (onApply) setReview(true);
            else void save();
          }}
        >
          {onApply ? "Next" : "Save"}
        </Button>
        <ToolButton label="Close studio" onClick={onClose}>
          <X size={22} />
        </ToolButton>
      </header>
      <div
        className={`studio-body ${browsingVariations ? "studio-variation-gallery" : ""}`}
        inert={review}
      >
        {!preview && (
          <>
            <nav className="studio-rail" aria-label="Design tools">
              {tools.map(({ tab: tool, label, icon: Icon }) => (
                <button
                  key={tool}
                  type="button"
                  aria-pressed={tab === tool}
                  onClick={() => setTab(tool)}
                  className={tab === tool ? "active" : ""}
                >
                  <Icon size={25} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
            <aside className="studio-panel">
              {initial?.baseProductId && !browsingVariations && (
                <div className="mb-5 rounded-xl border bg-slate-50 p-3">
                  {document.mockupImage && !document.productColour && (
                    <img
                      src={asset(document.mockupImage!)}
                      alt={product?.title || "Selected product reference"}
                      className="mx-auto mb-2 h-24 w-full object-contain"
                    />
                  )}
                  <p className="text-sm font-semibold">
                    {product?.title || "Selected product"}
                  </p>
                  {product?.customisation && (
                    <ProductOptions
                      product={product}
                      options={selectedProductOptions}
                      disabled={loading || busy}
                      onChange={changeProductOptions}
                    />
                  )}
                  {document.surface === "magnet" && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setTab("uploads");
                        askUpload(false);
                      }}
                      disabled={loading || busy}
                    >
                      <Upload size={20} /> Add your photo
                    </Button>
                  )}

                  {document.format === "product" && (
                    <div className="mt-3 flex gap-2">
                      {(["product", "artwork"] as const).map((mode) => (
                        <Button
                          key={mode}
                          size="sm"
                          variant={view === mode ? "default" : "outline"}
                          aria-pressed={view === mode}
                          disabled={loading || busy}
                          onClick={() => {
                            commit();
                            setView(mode);
                          }}
                        >
                          {mode === "product" ? "Product view" : "Artwork view"}
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-600">
                    {document.surface === "magnet"
                      ? "Single magnet, front view. Upload your photo to replace the coloured placeholder. Edit and move the caption directly."
                      : "Replace photo and logo placeholders. Drag your text and images inside the marked print area."}
                  </p>
                </div>
              )}
              {!browsingVariations && (
                <h2 className="mb-5 text-xl font-bold">
                  {tools.find((tool) => tool.tab === tab)?.label}
                </h2>
              )}
              {tab === "product" && (
                <div className="space-y-5">
                  <p className="font-semibold">
                    {product?.title || "Your design"}
                  </p>
                  {document.format === "card" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          document.width > document.height
                            ? "default"
                            : "outline"
                        }
                        disabled={loading || busy}
                        onClick={() => {
                          if (document.width < document.height)
                            replace(
                              resizeStudio(
                                document,
                                document.height,
                                document.width,
                              ),
                            );
                        }}
                      >
                        Landscape
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          document.height > document.width
                            ? "default"
                            : "outline"
                        }
                        disabled={loading || busy}
                        onClick={() => {
                          if (document.height < document.width)
                            replace(
                              resizeStudio(
                                document,
                                document.height,
                                document.width,
                              ),
                            );
                        }}
                      >
                        Portrait
                      </Button>
                    </div>
                  )}
                  <p className="text-sm leading-6 text-slate-600">
                    {document.format === "card"
                      ? "Two-sided visiting card artwork. Keep important text and logos inside the green safety guide. Confirm the final quantity, material and print quote before production."
                      : document.printArea
                        ? "Add text, photos and logos inside the outlined print area. Artwork outside this area is trimmed in the preview. Front and back are edited separately."
                        : "Add text, photos and logos to your artwork. Final dimensions and production specifications are confirmed with your quote."}
                  </p>
                  {Object.keys(selectedProductOptions).length > 0 && (
                    <dl className="space-y-2 text-sm">
                      {Object.entries(selectedProductOptions).map(
                        ([key, value]) => (
                          <div key={key} className="flex justify-between gap-3">
                            <dt className="capitalize text-slate-500">{key}</dt>
                            <dd>
                              {key === "orientation" &&
                              document.surface === "magnet"
                                ? document.width > document.height
                                  ? "Landscape"
                                  : document.width < document.height
                                    ? "Portrait"
                                    : "Square"
                                : value}
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  )}
                  <p className="rounded-xl bg-cyan-50 p-4 text-sm">
                    {document.width} × {document.height} design units
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setGuides((value) => !value)}
                  >
                    {guides ? "Hide" : "Show"} safety area
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={bleed}
                      onChange={(event) => setBleed(event.target.checked)}
                    />
                    Show bleed outline
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={rulers}
                      onChange={(event) => setRulers(event.target.checked)}
                    />
                    Show artwork dimensions
                  </label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void download()}
                    disabled={busy || loading || loadFailed}
                  >
                    <Download size={18} />
                    Download {side} proof
                  </Button>
                </div>
              )}
              {tab === "text" && (
                <div className="space-y-3">
                  <Button
                    className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    onClick={addText}
                    disabled={busy || loading || loadFailed}
                  >
                    <Plus size={20} />
                    Add text
                  </Button>
                  <p className="pb-2 text-xs leading-5 text-slate-500">
                    Double-click a text box on the artwork to type directly.
                    Drag its corners to resize, or use the toolbar above.
                  </p>
                  {textElements.map((item) => (
                    <label
                      key={item.id}
                      className={
                        "studio-text-field " +
                        (selected?.id === item.id ? "selected" : "")
                      }
                    >
                      <span className="sr-only">
                        Edit {item.text || "text"}
                      </span>
                      <input
                        className="w-full bg-transparent p-2 text-sm outline-none"
                        value={item.text || ""}
                        maxLength={500}
                        onFocus={(event) => {
                          event.target.select();
                          const object = canvas
                            ?.getObjects()
                            .find(
                              (object) =>
                                (object as StudioObject).studioElement?.id ===
                                item.id,
                            );
                          if (object && canvas) {
                            canvas.setActiveObject(object);
                            canvas.requestRenderAll();
                          }
                        }}
                        onChange={(event) =>
                          updateObject({ text: event.target.value }, item.id)
                        }
                      />
                    </label>
                  ))}
                  {!textElements.length && (
                    <p className="text-sm text-slate-500">
                      No text on this side yet. Add your first text box.
                    </p>
                  )}
                </div>
              )}
              {tab === "uploads" && (
                <div className="space-y-4">
                  <Button
                    className="w-full bg-cyan-400 text-slate-950"
                    onClick={() => askUpload(false)}
                    disabled={busy || loading}
                  >
                    <Upload size={20} />
                    Upload photo / logo
                  </Button>
                  {(selected?.type === "image" ||
                    !!magnetPhotoTarget(selected?.id) ||
                    isProductPhotoSlot(selected?.id) ||
                    selected?.id === "logo-placeholder" ||
                    selected?.id === "logo-label") && (
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => askUpload(true)}
                      disabled={busy || loading}
                    >
                      Replace selected image / logo
                    </Button>
                  )}
                  <p className="text-xs leading-5 text-slate-500">
                    PNG, JPEG or WebP up to 8 MB. Your uploaded photo is saved
                    securely with your design.
                  </p>
                  {ownUploads.error && (
                    <p role="alert" className="text-sm text-red-700">
                      {ownUploads.error}
                    </p>
                  )}
                  {ownUploads.loading && (
                    <p role="status">Loading your uploads…</p>
                  )}
                  {!!ownUploads.data?.data.length && (
                    <>
                      <h3 className="font-semibold">Your uploads</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {ownUploads.data.data.map((image, index) => (
                          <div
                            className="rounded-lg border border-slate-200 p-2"
                            key={image.id}
                          >
                            <img
                              className="aspect-square w-full object-contain"
                              src={`${apiBase}/design-images/${image.id}`}
                              alt={`Your uploaded image ${index + 1}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 w-full"
                              disabled={busy || loading}
                              onClick={() =>
                                void placeAsset({ uploadId: image.id })
                              }
                            >
                              Add image
                            </Button>
                            {(selected?.type === "image" ||
                              !!magnetPhotoTarget(selected?.id) ||
                              isProductPhotoSlot(selected?.id) ||
                              selected?.id === "logo-placeholder" ||
                              selected?.id === "logo-label") && (
                              <button
                                className="block w-full text-xs font-semibold text-primary underline"
                                disabled={busy || loading}
                                onClick={() =>
                                  void placeAsset(
                                    { uploadId: image.id },
                                    selected?.id,
                                  )
                                }
                              >
                                Replace selected
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  <h3 className="font-semibold">Image Library</h3>
                  {library.loading && (
                    <p role="status" className="text-sm">
                      Loading library…
                    </p>
                  )}
                  {library.error && (
                    <p role="alert" className="text-sm text-red-700">
                      {library.error}
                    </p>
                  )}
                  <div className="space-y-2">
                    {library.data?.data.map((image) => (
                      <button
                        className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-3 text-left text-sm hover:bg-cyan-50"
                        key={image.id}
                        onClick={() =>
                          void add(
                            element("image", {
                              left: document.width / 2,
                              top: document.height / 2,
                              width: document.width * 0.45,
                              height: document.height * 0.5,
                              productId: image.id,
                            }),
                          )
                        }
                        disabled={busy || loading || loadFailed}
                      >
                        <ImageIcon size={20} />
                        <span>
                          {image.libraryCategory}
                          <small className="block text-slate-500">
                            {image.title}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tab === "graphics" && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      name: "Rectangle",
                      type: "rect" as const,
                      width: 220,
                      height: 130,
                    },
                    {
                      name: "Circle",
                      type: "circle" as const,
                      width: 130,
                      height: 130,
                    },
                    {
                      name: "Line",
                      type: "rect" as const,
                      width: 400,
                      height: 5,
                    },
                  ].map((shape) => (
                    <button
                      key={shape.name}
                      className="rounded-xl border border-slate-200 p-5 text-sm hover:bg-cyan-50"
                      onClick={() =>
                        void add(
                          element(shape.type, {
                            left: document.width / 2,
                            top: document.height / 2,
                            width: shape.width,
                            height: shape.height,
                          }),
                        )
                      }
                      disabled={busy || loading || loadFailed}
                    >
                      <span
                        className="mx-auto mb-4 block bg-primary"
                        style={{
                          width: shape.name === "Line" ? 80 : 50,
                          height: shape.name === "Line" ? 4 : 40,
                          borderRadius: shape.name === "Circle" ? "50%" : 0,
                        }}
                      />
                      {shape.name}
                    </button>
                  ))}
                </div>
              )}
              {tab === "background" && (
                <div className="space-y-5">
                  <label className="block text-sm font-semibold">
                    Background colour
                    <input
                      aria-label="Page background colour"
                      type="color"
                      className="mt-3 h-12 w-full"
                      value={page.background}
                      onChange={(event) => {
                        if (canvas) {
                          canvas.backgroundColor = event.target.value;
                          canvas.requestRenderAll();
                          commit();
                        }
                      }}
                    />
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      "#ffffff",
                      "#103759",
                      "#e9f7ff",
                      "#fce7f3",
                      "#f2f6ef",
                      "#fff3c4",
                      "#d8c9f0",
                      "#252525",
                    ].map((color) => (
                      <button
                        key={color}
                        className="aspect-square rounded-lg border border-slate-200"
                        style={{ backgroundColor: color }}
                        aria-label={`Use background ${color}`}
                        onClick={() => {
                          if (canvas) {
                            canvas.backgroundColor = color;
                            canvas.requestRenderAll();
                            commit();
                          }
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    A product photo may cover the page background. This changes
                    the design background, not the fabric colour in a photo.
                  </p>
                </div>
              )}
              {tab === "colours" && (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">
                    Apply colours to this side. Your text and uploaded images
                    stay intact.
                  </p>
                  {studioTemplates.map((theme) => (
                    <button
                      key={theme.id}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left"
                      onClick={() => {
                        if (!canvas) return;
                        canvas.backgroundColor = theme.background;
                        for (const item of canvas.getObjects()) {
                          const data = (item as StudioObject).studioElement;
                          if (
                            data &&
                            data.type !== "image" &&
                            data.id !== "logo-placeholder"
                          )
                            item.set({
                              fill:
                                data.type === "text" && theme.id === "dark"
                                  ? "#ffffff"
                                  : theme.color,
                            });
                        }
                        canvas.requestRenderAll();
                        commit();
                      }}
                    >
                      <span
                        className="size-8 rounded-full border border-slate-200"
                        style={{ background: theme.color }}
                      />
                      <span>{theme.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {tab === "templates" && document.surface === "magnet" && (
                <MagnetTemplates
                  product={product}
                  selected={document.template}
                  disabled={loading || busy || loadFailed}
                  onSelect={(id, year) => {
                    commit();
                    replace(
                      applyMagnetLayout(
                        {
                          ...resizeStudio(documentRef.current, 1200, 900),
                          specification:
                            "Landscape magnet artwork — confirm your finished size",
                        },
                        id,
                        year,
                      ),
                    );
                    setTab("uploads");
                  }}
                  onUpload={() => {
                    commit();
                    replace(
                      applyMagnetLayout(documentRef.current, "full-photo"),
                    );
                    setTab("uploads");
                  }}
                />
              )}
              {tab === "templates" &&
                document.surface !== "magnet" &&
                product?.customisation && (
                  <ProductVariations
                    product={product}
                    options={selectedProductOptions}
                    onOptionsChange={changeProductOptions}
                    selected={document.template}
                    disabled={loading || busy || loadFailed}
                    onSelect={(settings) => {
                      commit();
                      const configured = productVariation(
                        product,
                        selectedProductOptions,
                        settings.studio!.template,
                        savedSettings(),
                        Number(
                          settings.studio!.pages.front.elements.find(
                            (e) => e.id === "calendar-year",
                          )?.text,
                        ) || undefined,
                      );
                      replace(configured.studio!);
                      setTab("uploads");
                    }}
                  />
                )}
              {tab === "templates" &&
                document.surface !== "magnet" &&
                !product?.customisation && (
                  <div className="space-y-4">
                    <p className="text-xs leading-5 text-slate-500">
                      Applying a template replaces the artwork layout. Undo
                      restores your previous design.
                    </p>
                    {studioTemplates.map((template) => (
                      <button
                        key={template.id}
                        className="w-full overflow-hidden rounded-xl border border-slate-200 text-left hover:border-cyan-500"
                        onClick={() => applyTemplate(template.id)}
                        disabled={loading || busy || loadFailed}
                      >
                        {document.format === "card" ? (
                          <div className="aspect-[940/580] bg-slate-50">
                            <StudioPreview
                              settings={templatePreviews[template.id]!}
                            />
                          </div>
                        ) : (
                          <div
                            className="h-28 p-5"
                            style={{
                              backgroundColor: template.background,
                              color: template.color,
                            }}
                          >
                            <p className="font-bold">Your design</p>
                            <p className="mt-2 text-sm">Make it yours</p>
                          </div>
                        )}
                        <p className="border-t border-slate-100 p-3 text-sm font-semibold">
                          {template.name}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              {tab === "more" && (
                <StudioMorePanel
                  selected={selected}
                  onCrop={(crop) => void applyCrop(crop)}
                  onFlip={(axis) =>
                    updateObject(
                      axis === "x"
                        ? { flipX: !active()?.flipX }
                        : { flipY: !active()?.flipY },
                    )
                  }
                  onAlign={alignElement}
                  onShadow={(enabled, blur) =>
                    updateObject({
                      shadow: enabled
                        ? new Shadow({
                            color: "#000000",
                            blur: blur ?? selected?.shadow?.blur ?? 8,
                            offsetX: 3,
                            offsetY: 3,
                          })
                        : null,
                    })
                  }
                  onSpacing={(charSpacing) => updateObject({ charSpacing })}
                  onCopy={copyLayer}
                  onPaste={pasteLayer}
                  canPaste={!!clipboard}
                  onZoomFit={() => setZoom(100)}
                  onClear={clearSide}
                />
              )}
              {tab === "layers" && (
                <div className="space-y-2">
                  <p className="mb-4 text-xs leading-5 text-slate-500">
                    Select an element, duplicate it, lock its position, change
                    its order or delete it.
                  </p>
                  {[...page.elements].reverse().map((item) => (
                    <button
                      key={item.id}
                      className={
                        "flex w-full items-center gap-2 rounded-lg border p-3 text-left text-sm " +
                        (selected?.id === item.id
                          ? "border-cyan-400 bg-cyan-50"
                          : "border-slate-200")
                      }
                      onClick={() => {
                        const object = canvas
                          ?.getObjects()
                          .find(
                            (object) =>
                              (object as StudioObject).studioElement?.id ===
                              item.id,
                          );
                        if (object && canvas) {
                          canvas.setActiveObject(object);
                          canvas.requestRenderAll();
                        }
                      }}
                    >
                      {item.locked ? (
                        <Lock size={16} />
                      ) : item.type === "text" ? (
                        <Type size={16} />
                      ) : (
                        <Shapes size={16} />
                      )}
                      <span className="truncate">{item.text || item.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </aside>
          </>
        )}
        <main className="studio-workspace">
          {!preview && (
            <div className="studio-toolbar">
              <select
                aria-label="Font family"
                value={selected?.fontFamily || "Arial"}
                disabled={!selectedText}
                onChange={(event) =>
                  updateObject({ fontFamily: event.target.value })
                }
              >
                {["Arial", "Georgia", "Verdana", "monospace"].map((font) => (
                  <option key={font}>{font}</option>
                ))}
              </select>
              <ToolButton
                label="Decrease font size"
                onClick={() =>
                  updateObject({
                    fontSize: Math.max(8, (selected?.fontSize || 32) - 1),
                  })
                }
                disabled={!selectedText}
              >
                <Minus size={18} />
              </ToolButton>
              {selectedText ? (
                <NumberField
                  label="Font size"
                  min={8}
                  max={200}
                  value={Math.round(selected?.fontSize || 32)}
                  onCommit={(fontSize) => updateObject({ fontSize })}
                  className="w-16 rounded-lg border border-slate-200 p-2 text-center"
                />
              ) : (
                <input
                  aria-label="Font size"
                  className="w-16 rounded-lg border border-slate-200 p-2 text-center"
                  value="32"
                  disabled
                  readOnly
                />
              )}
              <ToolButton
                label="Increase font size"
                onClick={() =>
                  updateObject({
                    fontSize: Math.min(200, (selected?.fontSize || 32) + 1),
                  })
                }
                disabled={!selectedText}
              >
                <Plus size={18} />
              </ToolButton>
              <input
                aria-label="Selected element colour"
                title="Text or shape colour"
                type="color"
                value={selected?.fill || "#103759"}
                className="h-9 w-9 shrink-0"
                disabled={!selected || selected.type === "image"}
                onChange={(event) => updateObject({ fill: event.target.value })}
              />
              <ToolButton
                label="Bold"
                onClick={() =>
                  updateObject({
                    fontWeight:
                      selected?.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
                disabled={!selectedText}
                pressed={selected?.fontWeight === "bold"}
              >
                <Bold size={20} />
              </ToolButton>
              <ToolButton
                label="Italic"
                onClick={() =>
                  updateObject({
                    fontStyle:
                      selected?.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                disabled={!selectedText}
                pressed={selected?.fontStyle === "italic"}
              >
                <Italic size={20} />
              </ToolButton>
              <ToolButton
                label="Underline"
                onClick={() =>
                  updateObject({ underline: !selected?.underline })
                }
                disabled={!selectedText}
                pressed={selected?.underline}
              >
                <Underline size={20} />
              </ToolButton>
              {[
                { value: "left", Icon: AlignLeft },
                { value: "center", Icon: AlignCenter },
                { value: "right", Icon: AlignRight },
              ].map(({ value, Icon }) => (
                <ToolButton
                  key={value}
                  label={`Align ${value}`}
                  onClick={() => updateObject({ textAlign: value })}
                  disabled={!selectedText}
                  pressed={selected?.textAlign === value}
                >
                  <Icon size={20} />
                </ToolButton>
              ))}
              <ToolButton
                label={selected?.locked ? "Unlock element" : "Lock element"}
                onClick={toggleLock}
                disabled={!selected}
              >
                {selected?.locked ? <Unlock size={20} /> : <Lock size={20} />}
              </ToolButton>
              <ToolButton
                label="Duplicate element"
                onClick={duplicate}
                disabled={!selected || busy}
              >
                <Copy size={20} />
              </ToolButton>
              <ToolButton
                label="Delete element"
                onClick={remove}
                disabled={!selected}
              >
                <Trash2 size={20} />
              </ToolButton>
            </div>
          )}
          {!preview && selected && (
            <div className="studio-properties">
              <span className="font-semibold capitalize">{selected.type}</span>
              <label>
                Rotation{" "}
                <NumberField
                  label="Element rotation"
                  min={-360}
                  max={360}
                  value={Math.round(selected.angle)}
                  onCommit={(angle) => updateObject({ angle })}
                />
              </label>
              <label>
                Opacity{" "}
                <input
                  aria-label="Element opacity"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.opacity}
                  onChange={(event) =>
                    updateObject({ opacity: Number(event.target.value) })
                  }
                />
              </label>
              {selectedText && (
                <label>
                  Line spacing{" "}
                  <NumberField
                    label="Line spacing"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={selected.lineHeight || 1.16}
                    onCommit={(lineHeight) => updateObject({ lineHeight })}
                  />
                </label>
              )}
              <ToolButton
                label="Bring forward"
                onClick={() => {
                  const object = active();
                  if (object && canvas) {
                    canvas.bringObjectForward(object);
                    commit();
                    canvas.requestRenderAll();
                  }
                }}
              >
                <ArrowUp size={18} />
              </ToolButton>
              <ToolButton
                label="Send backward"
                onClick={() => {
                  const object = active();
                  if (object && canvas) {
                    const items = canvas.getObjects();
                    const floor = (items[0] as StudioObject | undefined)
                      ?.studioElement
                      ? 0
                      : 1;
                    if (items.indexOf(object) <= floor) return;
                    canvas.sendObjectBackwards(object);
                    commit();
                    canvas.requestRenderAll();
                  }
                }}
              >
                <ArrowDown size={18} />
              </ToolButton>
            </div>
          )}
          <div className="studio-stage" ref={viewport}>
            <div className="studio-artwork" data-bleed={bleed}>
              <canvas
                ref={setNode}
                aria-label="Editable design canvas. Double-click text to edit, drag to move and use corner handles to resize."
              />
              {!preview && !loading && !loadFailed && selected && context && (
                <div
                  className="studio-floating"
                  style={context}
                  aria-label="Selected object actions"
                >
                  <ToolButton
                    label={selected.locked ? "Unlock" : "Lock"}
                    onClick={toggleLock}
                  >
                    {selected.locked ? (
                      <Unlock size={18} />
                    ) : (
                      <Lock size={18} />
                    )}
                  </ToolButton>
                  <ToolButton
                    label="Duplicate"
                    onClick={duplicate}
                    disabled={busy}
                  >
                    <Copy size={18} />
                  </ToolButton>
                  <ToolButton label="Delete" onClick={remove}>
                    <Trash2 size={18} />
                  </ToolButton>
                  {(selected.type === "image" ||
                    selected.id === "logo-placeholder" ||
                    selected.id === "logo-label") && (
                    <ToolButton
                      label="Replace image or logo"
                      onClick={() => askUpload(true)}
                    >
                      <Upload size={18} />
                    </ToolButton>
                  )}
                  <ToolButton
                    label="More object options"
                    onClick={() => setTab("more")}
                  >
                    <MoreHorizontal size={18} />
                  </ToolButton>
                </div>
              )}
              {guides && !preview && (
                <div
                  className="studio-safety"
                  style={{
                    ...(document.printArea
                      ? {
                          left: `${document.printArea.x * 100}%`,
                          top: `${document.printArea.y * 100}%`,
                          width: `${document.printArea.width * 100}%`,
                          height: `${document.printArea.height * 100}%`,
                        }
                      : {
                          inset: `${(safeMargin(document) / document.height) * 100}% ${(safeMargin(document) / document.width) * 100}%`,
                        }),
                  }}
                  aria-hidden="true"
                >
                  <span>Safety area</span>
                </div>
              )}
              {bleed && !preview && (
                <span className="studio-bleed" aria-hidden="true">
                  Bleed
                </span>
              )}
              {rulers && !preview && (
                <>
                  <div className="studio-ruler-x" aria-label="Artwork width">
                    <span>
                      {document.format === "card"
                        ? `${(document.width / 100).toFixed(1)} cm`
                        : `${document.width} px`}
                    </span>
                  </div>
                  <div className="studio-ruler-y" aria-label="Artwork height">
                    <span>
                      {document.format === "card"
                        ? `${(document.height / 100).toFixed(1)} cm`
                        : `${document.height} px`}
                    </span>
                  </div>
                </>
              )}
            </div>
            {loading && (
              <div className="studio-loading" role="status">
                Loading artwork…
              </div>
            )}
          </div>
          <div className="studio-bottom">
            <div className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
              <ToolButton
                label="Zoom out"
                onClick={() => setZoom((value) => Math.max(50, value - 10))}
              >
                <Minus size={18} />
              </ToolButton>
              <span className="w-12 text-center text-sm font-semibold">
                {zoom}%
              </span>
              <ToolButton
                label="Zoom in"
                onClick={() => setZoom((value) => Math.min(200, value + 10))}
              >
                <Plus size={18} />
              </ToolButton>
              <ToolButton
                label="Canvas settings"
                onClick={() => {
                  setTab("more");
                  setPreview(false);
                }}
              >
                <Settings size={20} />
              </ToolButton>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void download()}
              disabled={busy || loading || loadFailed}
            >
              <Download size={18} />
              Download {side} preview
            </Button>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={guides}
                onChange={(event) => setGuides(event.target.checked)}
              />
              Safety guides
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={bleed}
                onChange={(event) => setBleed(event.target.checked)}
              />
              Bleed
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={rulers}
                onChange={(event) => setRulers(event.target.checked)}
              />
              Dimensions
            </label>
          </div>
        </main>
        {twoSided && (
          <aside className="studio-sides" aria-label="Artwork sides">
            {(["front", "back"] as StudioSide[]).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={side === item}
                onClick={() => setSide(item)}
                disabled={loading || busy || loadFailed}
              >
                <div
                  className={side === item ? "selected" : ""}
                  style={{ backgroundColor: document.pages[item].background }}
                >
                  {thumbs[item] ? (
                    <img src={thumbs[item]} alt={`${item} artwork thumbnail`} />
                  ) : (
                    <span className="text-[9px] text-slate-500">
                      {item === "back" ? "Company Name" : "Front artwork"}
                    </span>
                  )}
                </div>
                <span className="mt-2 block text-sm capitalize">{item}</span>
              </button>
            ))}
          </aside>
        )}
      </div>
      {review && (
        <StudioReview
          product={product}
          settings={savedSettings()}
          onBack={() => setReview(false)}
          onConfirm={() => {
            onApply?.({ ...savedSettings(), artworkApproved: true });
            onClose();
          }}
        />
      )}
      {(error || success || busy) && (
        <div
          inert={review}
          className={
            "studio-status " +
            (error ? "bg-red-50 text-red-800" : "bg-cyan-50 text-primary")
          }
          role={error ? "alert" : "status"}
        >
          {error || success || (busy ? "Working…" : "")}
          {loadFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevision((value) => value + 1)}
            >
              Reload artwork
            </Button>
          )}
          {error && (
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
