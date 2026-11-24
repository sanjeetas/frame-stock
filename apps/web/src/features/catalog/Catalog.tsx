import { CategorySlider } from "../../components/CategorySlider";
import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Heart,
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
  const title = (custom && customFamily) || category?.name || (group === "All products" ? "Explore our products" : group);
  const bannerParams = new URLSearchParams(params);
  bannerParams.delete("page");
  bannerParams.set("limit", "3");
  bannerParams.set("sort", "featured");
  const bannerPath = group === "All products" && !categoryId && !query
    ? null : "/products?" + bannerParams;

  return (
    <section id="catalog" className="mx-auto max-w-7xl px-5 py-10">
      <CategorySlider key={bannerPath || "phulo-originals"} path={bannerPath} title={title} onOpen={onOpen} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold tracking-[.16em] text-accent">PRINT · PERSONALISE · INSPIRE</p>
          <h2 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h2>
        </div>
        {data && <p className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-semibold text-primary">{data.meta?.total} results to explore</p>}
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
      <div id="catalog-results" className="mb-7 grid gap-3 rounded-2xl border border-cyan-100 bg-[#edf6fc] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
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
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 min-[360px]:grid-cols-2 lg:grid-cols-4">
            {data.data.map((p) => (
              <article
                key={p.id}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-lg"
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
                  className="mt-1 min-h-10 max-w-full break-words text-left text-base font-semibold"
                  onClick={() => onOpen(p)}
                >
                  {p.title}
                </button>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-primary">
                    {<Price product={p} />}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {p.price !== null && !p.priceDisplay ? "/ " + p.unit : ""}
                    </span>
                  </span>
                  <Button className="w-full min-w-0 whitespace-normal px-2 text-center" variant="outline" size="sm" onClick={() => onOpen(p)}>
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
