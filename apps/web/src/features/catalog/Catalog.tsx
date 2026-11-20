import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Heart,
  Printer,
  Palette,
  Sparkles,
} from "lucide-react";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Loading, ErrorState, Empty } from "../../components/Feedback";
import type { Product, Category } from "../../types";
import { Price } from "./Price";
import { imageUrl } from "../../lib/utils";
import { Artwork } from "./Artwork";
interface Props {
  group: string;
  categoryId: string;
  categories: Category[];
  onCategory: (id: string) => void;
  onOpen: (p: Product) => void;
}
export function Catalog({
  group,
  categoryId,
  categories,
  onCategory,
  onOpen,
}: Props) {
  const [search, setSearch] = useState(""),
    [sort, setSort] = useState("featured"),
    [page, setPage] = useState(1),
    [wishes, setWishes] = useState<string[]>([]),
    [customFamily, setCustomFamily] = useState("");
  const custom = group === "Customised Products";
  const families = useApiQuery<
    { name: string; count: number; image?: string; sampleTitle?: string }[]
  >(custom ? "/custom-products/categories" : null);
  useEffect(() => setCustomFamily(""), [group]);
  const query = useDebouncedValue(search);
  useEffect(() => setPage(1), [query, categoryId, customFamily, sort, group]);
  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    sort,
    ...(query ? { search: query } : {}),
    ...(categoryId && !custom ? { categoryId } : {}),
    ...(custom && customFamily ? { customFamily } : {}),
    ...(group !== "All products" ? { group } : {}),
  });
  const { data, loading, error, reload } = useApiQuery<Product[]>(
    "/products?" + params,
  );
  const showFamilies = custom && !customFamily && !query;
  const category = categories.find((item) => String(item.id) === categoryId);
  return (
    <section id="catalog" className="mx-auto max-w-7xl px-5 py-10">
      <div className="collection-banner mb-7 grid items-center gap-8 rounded-3xl p-7 text-white md:grid-cols-[1.3fr_1fr] md:p-10">
        <div className="relative z-10">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold tracking-[.16em] text-cyan-100">
            <Sparkles size={18} /> THE PRINT & PERSONALISE COLLECTION
          </p>
          <h2
            key={group}
            className="collection-title text-4xl font-bold leading-tight sm:text-5xl"
          >
            {category ? (
              category.name
            ) : group === "All products" ? (
              <>
                Big ideas.
                <br />
                <span className="text-[#ffe16a]">Full colour.</span>
              </>
            ) : (
              group
            )}
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-blue-100">
            {custom
              ? "Choose your product and specifications. Start with a template or upload, personalise your design, approve the preview and send your order request."
              : "Print it. Gift it. Make it yours. Discover standout prints, personalised products and designs for every idea."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white px-4 py-2 font-semibold text-primary">
              Made for your imagination
            </span>
            {data && (
              <span className="rounded-full border border-white/30 px-4 py-2">
                {data.meta?.total} results to explore
              </span>
            )}
          </div>
        </div>
        <div
          className="print-art relative mx-auto h-60 w-full max-w-80"
          aria-hidden="true"
        >
          <div className="ink-orbit ink-cyan" />
          <div className="ink-orbit ink-pink" />
          <div className="ink-orbit ink-yellow" />
          <div className="print-sheet absolute inset-x-9 top-5 rounded-2xl bg-white p-5 text-primary shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <Printer size={30} />
              <span className="text-xs font-bold tracking-widest">
                CREATE / PRINT
              </span>
            </div>
            <div className="flex gap-2">
              {["#08bde3", "#ef3b96", "#ffd548", "#113655"].map((color) => (
                <span
                  key={color}
                  className="h-14 flex-1 rounded-lg"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">
              GOOD IDEAS.
              <br />
              GREAT IMPRESSIONS.
            </p>
          </div>
          <div className="print-sticker absolute -right-1 bottom-0 flex items-center gap-2 rounded-xl bg-[#ffe16a] px-4 py-3 text-sm font-bold text-primary shadow-xl">
            <Palette size={22} /> A little more colour.
          </div>
        </div>
      </div>
      {custom && (
        <div className="mb-7 rounded-2xl border border-cyan-100 bg-white p-5">
          <h3 className="font-bold text-primary">
            Make something uniquely yours
          </h3>
          <ol className="mt-3 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
            {[
              "Choose category & product type",
              "Pick a design variation",
              "Personalise & review",
              "Approve & request a quote",
            ].map((step, i) => (
              <li key={step}>
                <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-cyan-100 font-bold text-primary">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {families.error && (
            <ErrorState message={families.error} retry={families.reload} />
          )}
        </div>
      )}
      {custom && customFamily && (
        <nav
          aria-label="Customised product breadcrumb"
          className="mb-5 flex flex-wrap items-center gap-2 text-sm"
        >
          <button
            className="underline"
            onClick={() => {
              setCustomFamily("");
              setSearch("");
            }}
          >
            Customised products
          </button>
          <span>/</span>
          <span className="font-semibold">{customFamily}</span>
          <span className="text-slate-500">
            → Select a product type → Choose a design → Personalise
          </span>
        </nav>
      )}
      <div className="mb-7 grid gap-3 rounded-2xl border border-cyan-100 bg-[#edf6fc] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="relative">
          <label htmlFor="catalog-search" className="sr-only">
            Search catalog
          </label>
          <Search
            size={20}
            className="absolute top-3.5 left-3 text-slate-400"
          />
          <Input
            id="catalog-search"
            className="pl-9"
            value={search}
            maxLength={100}
            placeholder="Search products, images, designs…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {custom ? (
          <select
            className="min-w-0 w-full"
            aria-label="Filter customised product family"
            value={customFamily}
            onChange={(e) => setCustomFamily(e.target.value)}
          >
            <option value="">Browse custom categories</option>
            {families.data?.data.map((family) => (
              <option key={family.name} value={family.name}>
                {family.name} ({family.count})
              </option>
            ))}
          </select>
        ) : (
          <select
            className="min-w-0 w-full"
            aria-label="Filter by category"
            value={categoryId}
            onChange={(event) => onCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.parent ? "↳ " : ""}
                {item.name}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Sort products"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
          <option value="az">Name: A–Z</option>
        </select>
      </div>
      {customFamily === "T-Shirts & Apparel" && (
        <div className="mb-6 flex flex-wrap gap-2" aria-label="T-shirt types">
          {[
            ["All types", ""],
            ["Cotton crew-neck", "Cotton T-Shirts"],
            ["Full sleeve", "Full Sleeve"],
            ["Polo", "Polo"],
            ["Hoodies", "Hoodies"],
            ["Shirts", "Dress Shirts"],
            ["Jackets", "Jackets"],
            ["Aprons", "Aprons"],
            ["Women's", "Women"],
            ["Kids", "Kids"],
          ].map(([label, value]) => (
            <button
              type="button"
              key={label}
              aria-pressed={search === value}
              className={`rounded-full border px-4 py-2 text-sm ${search === value ? "border-cyan-600 bg-cyan-50" : "bg-white"}`}
              onClick={() => setSearch(value!)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {showFamilies ? (
        families.loading ? (
          <Loading text="Loading custom categories…" />
        ) : families.error ? (
          <ErrorState message={families.error} retry={families.reload} />
        ) : (
          <div>
            <h3 className="mb-5 text-2xl font-bold">
              What would you like to customise?
            </h3>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
              {families.data?.data.map((family) => (
                <button
                  key={family.name}
                  type="button"
                  aria-label={`Browse ${family.name}`}
                  className="overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-shadow hover:shadow-lg"
                  onClick={() => {
                    setCustomFamily(family.name);
                    setSearch("");
                  }}
                >
                  <div className="aspect-[1.2] bg-slate-50 p-3">
                    {family.image && (
                      <img
                        src={imageUrl(family.image)}
                        alt={family.sampleTitle || family.name}
                        loading="lazy"
                        className="size-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{family.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {family.count} product types
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      ) : loading ? (
        <Loading text="Loading collection…" />
      ) : error ? (
        <ErrorState message={error} retry={reload} />
      ) : data?.data.length ? (
        <>
          <div className="grid gap-x-5 gap-y-8 grid-cols-2 lg:grid-cols-4">
            {data.data.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[1.1] overflow-hidden rounded-lg bg-slate-100">
                  <button
                    className="size-full"
                    onClick={() => onOpen(p)}
                    aria-label={"View " + p.title}
                  >
                    <Artwork product={p} />
                  </button>
                  <button
                    className="absolute top-2 right-2 rounded-full bg-white p-2 text-primary shadow-sm"
                    aria-label={"Save " + p.title}
                    aria-pressed={wishes.includes(p.id)}
                    onClick={() =>
                      setWishes((v) =>
                        v.includes(p.id)
                          ? v.filter((id) => id !== p.id)
                          : [...v, p.id],
                      )
                    }
                  >
                    <Heart
                      size={20}
                      fill={wishes.includes(p.id) ? "currentColor" : "none"}
                    />
                  </button>
                  {p.editable && (
                    <span className="absolute top-2 left-2 rounded bg-white/90 p-1 text-xs tracking-wide">
                      CUSTOMISABLE
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-slate-500">{p.category}</p>
                <button
                  className="mt-1 min-h-10 text-left text-base font-semibold"
                  onClick={() => onOpen(p)}
                >
                  {p.title}
                </button>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-primary">
                    {p.customisation?.quoteRequired ? (
                      "Price on request"
                    ) : (
                      <Price product={p} />
                    )}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {p.price !== null && !p.priceDisplay ? "/ " + p.unit : ""}
                    </span>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => onOpen(p)}>
                    {p.customisation ? "Choose & customise ↗" : "View ↗"}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-9 flex items-center justify-center gap-4">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </Button>
            <span className="text-xs">
              Page {page} of {data.meta?.pages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= (data.meta?.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </>
      ) : (
        <Empty
          title="No products found"
          description="Try a different category or search."
        />
      )}
      {group === "Image Library" && (
        <p className="mt-8 rounded-lg bg-slate-50 p-5 text-xs leading-6 text-slate-500">
          Library designs currently include original sample graphics. Previews
          and custom exports are watermarked. Original HD assets are available
          only after upload and payment verification.
        </p>
      )}
    </section>
  );
}
