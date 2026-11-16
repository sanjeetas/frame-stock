import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Loading, ErrorState, Empty } from "../../components/Feedback";
import type { Product } from "../../types";
import { money } from "../../lib/utils";
import { Artwork } from "./Artwork";
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
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[.2em] text-cyan-700">
            PHULO COLLECTION
          </p>
          <h2 className="text-3xl font-bold">
            {group === "All products" ? "Find your next idea." : group}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Browse, personalise and send us your requirements.
          </p>
        </div>
        {data && (
          <p className="text-sm text-slate-500">{data.meta?.total} results</p>
        )}
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {groups.map((g) => (
          <Button
            key={g}
            variant={group === g ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setCategory("");
              onGroup(g);
            }}
          >
            {g}
          </Button>
        ))}
      </div>
      <div className="mb-7 grid gap-3 border-y border-slate-200 py-4 sm:grid-cols-[1fr_1fr_auto]">
        <div className="relative">
          <label htmlFor="catalog-search" className="sr-only">
            Search catalog
          </label>
          <Search size={16} className="absolute top-3 left-3 text-slate-400" />
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
              <article key={p.id}>
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
                      size={16}
                      fill={wishes.includes(p.id) ? "currentColor" : "none"}
                    />
                  </button>
                  {p.editable && (
                    <span className="absolute top-2 left-2 rounded bg-white/90 p-1 text-[8px] tracking-wide">
                      CUSTOMISABLE
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[10px] text-slate-500">{p.category}</p>
                <button
                  className="mt-1 min-h-10 text-left text-sm font-semibold"
                  onClick={() => onOpen(p)}
                >
                  {p.title}
                </button>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-primary">
                    {money(p.price)}
                    <span className="ml-1 text-[9px] font-normal text-slate-500">
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
              <ChevronLeft size={16} />
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
              <ChevronRight size={16} />
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
