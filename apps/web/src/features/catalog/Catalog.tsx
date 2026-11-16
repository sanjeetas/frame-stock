import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Heart,
  Printer,
  Gift,
  Palette,
  Image,
  Sparkles,
  Layers,
} from "lucide-react";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Loading, ErrorState, Empty } from "../../components/Feedback";
import type { Product } from "../../types";
import { money } from "../../lib/utils";
import { Artwork } from "./Artwork";
const groupIcons = [Layers, Printer, Gift, Palette, Image];
const groups = [
  "All products",
  "Printing Products",
  "Gifting Items",
  "Customised Products",
  "Image Library",
] as const;
interface Props {
  group: string;
  onOpen: (p: Product) => void;
  onGroup: (group: string) => void;
}
export function Catalog({ group, onOpen, onGroup }: Props) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("featured"),
    [page, setPage] = useState(1),
    [wishes, setWishes] = useState<string[]>([]);
  const query = useDebouncedValue(search);
  useEffect(() => setPage(1), [query, category, sort, group]);
  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    sort,
    ...(query ? { search: query } : {}),
    ...(category ? { category } : {}),
    ...(group !== "All products" ? { group } : {}),
  });
  const { data, loading, error, reload } = useApiQuery<Product[]>(
    "/products?" + params,
  );
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
            {group === "All products" ? (
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
            Print it. Gift it. Make it yours. Discover standout prints,
            personalised products and designs for every idea.
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
      <div className="collection-tabs mb-5 flex flex-wrap gap-3">
        {groups.map((g, index) => {
          const Icon = groupIcons[index]!;
          return (
            <Button
              key={g}
              variant={group === g ? "default" : "outline"}
              size="sm"
              className="collection-tab"
              aria-pressed={group === g}
              onClick={() => {
                setCategory("");
                onGroup(g);
              }}
            >
              <Icon size={20} />
              {g}
            </Button>
          );
        })}
      </div>
      <div className="mb-7 grid gap-3 rounded-2xl border border-cyan-100 bg-[#edf6fc] p-4 sm:grid-cols-[1fr_1fr_auto]">
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
        <Input
          aria-label="Filter by category"
          placeholder="Category, e.g. Nature"
          value={category}
          maxLength={100}
          onChange={(e) => setCategory(e.target.value)}
        />
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
      {loading ? (
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
                    {money(p.price)}
                    <span className="ml-1 text-xs font-normal text-slate-500">
                      {p.price !== null ? "/ " + p.unit : ""}
                    </span>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => onOpen(p)}>
                    View ↗
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
