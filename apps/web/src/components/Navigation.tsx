import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import type { Category } from "../types";
import { Button } from "./ui/button";

const signageIds = [229, 220, 221, 222, 223, 231, 224, 225, 226];
interface Props {
  categories: Category[];
  route: string;
  group: string;
  onBrowse: (group: string, categoryId?: string) => void;
}
export function Navigation({ categories, route, group, onBrowse }: Props) {
  const [panel, setPanel] = useState<"all" | "signage" | "images" | null>(null);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setPanel(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanel(null);
        nav.current
          ?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')
          ?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const choose = (selectedGroup: string, categoryId?: string) => {
    setPanel(null);
    onBrowse(selectedGroup, categoryId);
  };
  const shown =
    panel === "signage"
      ? signageIds
          .map((id) => categories.find((category) => category.id === id))
          .filter((category): category is Category => !!category)
      : panel === "images"
        ? categories.filter((category) =>
            [203, 206, 208, 209, 205, 223].includes(category.id),
          )
        : categories;
  return (
    <nav
      ref={nav}
      aria-label="Main navigation"
      className="colour-nav sticky top-0 z-30 shadow-md"
    >
      <div className="nav-row mx-auto flex max-w-7xl flex-nowrap items-center gap-2 overflow-x-auto px-5 py-2 text-sm whitespace-nowrap">
        <Button
          className="nav-categories h-12"
          aria-expanded={panel === "all"}
          aria-controls="category-dropdown"
          onClick={() => setPanel(panel === "all" ? null : "all")}
        >
          <Menu size={20} />
          All categories
        </Button>
        <a
          href="#home"
          onClick={() => setPanel(null)}
          aria-current={route === "home" ? "page" : undefined}
        >
          Home
        </a>
        <button
          className="nav-item gap-2"
          aria-expanded={panel === "signage"}
          aria-controls="category-dropdown"
          onClick={() => setPanel(panel === "signage" ? null : "signage")}
        >
          Signage & Boards <ChevronDown size={16} />
        </button>
        <button
          className="nav-item gap-2"
          aria-expanded={panel === "images"}
          aria-controls="category-dropdown"
          onClick={() => setPanel(panel === "images" ? null : "images")}
        >
          Image Library <ChevronDown size={16} />
        </button>
        {["Gifting Items", "Customised Products"].map((item) => (
          <button
            key={item}
            className="nav-item"
            aria-current={
              route === "catalog" && group === item ? "page" : undefined
            }
            onClick={() => choose(item)}
          >
            {item}
          </button>
        ))}
        <a
          href="#contact"
          onClick={() => setPanel(null)}
          aria-current={route === "contact" ? "page" : undefined}
        >
          Contact us
        </a>
      </div>
      {panel && (
        <div
          id="category-dropdown"
          className="category-dropdown absolute top-full right-0 left-0 mx-auto max-h-[65vh] max-w-7xl overflow-y-auto rounded-b-2xl border border-slate-200 bg-white p-5 shadow-xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              {panel === "signage"
                ? "Signage & Boards"
                : panel === "images"
                  ? "Image Library & Fabrication"
                  : "All categories"}
            </h2>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Close categories"
              onClick={() => setPanel(null)}
            >
              <X size={20} />
            </Button>
          </div>
          <button
            className="mb-4 font-semibold text-accent underline underline-offset-4"
            onClick={() =>
              choose(
                "All products",
                panel === "signage"
                  ? "219"
                  : panel === "images"
                    ? "203"
                    : undefined,
              )
            }
          >
            View {panel === "all" ? "all products" : "category products"} →
          </button>
          {shown.length ? (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((category) => (
                <li key={category.id}>
                  <button
                    className="w-full rounded-xl bg-slate-50 p-3 text-left leading-6 transition-colors hover:bg-cyan-50 hover:text-primary"
                    onClick={() => choose("All products", String(category.id))}
                  >
                    {category.parent !== 0 && (
                      <span aria-hidden="true">↳ </span>
                    )}
                    {category.name}
                    <span className="ml-2 text-xs text-slate-500">
                      ({category.count})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p role="status">
              You can browse all products while the category list loads.
            </p>
          )}
        </div>
      )}
    </nav>
  );
}
