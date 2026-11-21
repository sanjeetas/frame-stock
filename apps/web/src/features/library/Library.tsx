import { useEffect, useState } from "react";
import { Image, Download, Search } from "lucide-react";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Loading, ErrorState, Empty } from "../../components/Feedback";
import { Artwork } from "../catalog/Artwork";
import { Price } from "../catalog/Price";
import type { Product } from "../../types";
export function Library({ onOpen }: { onOpen: (product: Product) => void }) {
  const [category, setCategory] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState("featured");
  const query = useDebouncedValue(search);
  useEffect(() => setPage(1), [category, query, sort]);
  const categories = useApiQuery<string[]>("/library/categories");
  const params = new URLSearchParams({
    page: String(page),
    limit: "12",
    sort,
    ...(category ? { libraryCategory: category } : {}),
    ...(query ? { search: query } : {}),
  });
  const products = useApiQuery<Product[]>("/library?" + params);
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="collection-banner mb-7 rounded-3xl p-8 text-white">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-100">
          <Image size={22} /> IMAGE LIBRARY
        </p>
        <h1 className="text-4xl font-bold">
          Find the image for your next idea.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-blue-100">
          Browse original illustrations by category. Preview free, customise
          your proof, or request a priced HD license.
        </p>
        <a
          href="#downloads"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-primary"
        >
          <Download size={20} />
          My image downloads
        </a>
      </div>
      {categories.error && (
        <ErrorState message={categories.error} retry={categories.reload} />
      )}
      <div id="library-results" className="mb-5 flex flex-wrap gap-2" aria-label="Image categories">
        <Button
          variant={category ? "outline" : "default"}
          aria-pressed={!category}
          onClick={() => setCategory("")}
        >
          All images
        </Button>
        {categories.data?.data.map((item) => (
          <Button
            key={item}
            variant={category === item ? "default" : "outline"}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="mb-7 grid gap-3 rounded-2xl bg-cyan-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search
            className="absolute top-3.5 left-3 text-slate-400"
            size={20}
          />
          <Input
            aria-label="Search image library"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Nature, Flowers, Business…"
            className="pl-10"
          />
        </div>
        <select
          aria-label="Sort images"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
          <option value="az">Name: A–Z</option>
        </select>
      </div>
      {products.loading ? (
        <Loading text="Loading images…" />
      ) : products.error ? (
        <ErrorState message={products.error} retry={products.reload} />
      ) : products.data?.data.length ? (
        <>
          <p className="mb-4 text-sm text-slate-600">
            {products.data.meta?.total} images · Original digital illustrations
            · HD PNG
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.data.data.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  className="block aspect-[3/2] w-full bg-slate-100"
                  aria-label={"View " + product.title}
                  onClick={() => onOpen(product)}
                >
                  <Artwork product={product} />
                </button>
                <div className="p-5">
                  <p className="text-sm text-cyan-700">
                    {product.libraryCategory}
                  </p>
                  <h2 className="my-2 text-lg font-semibold">
                    {product.title}
                  </h2>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-bold">
                      <Price product={product} /> / HD license
                    </span>
                    <Button size="sm" onClick={() => onOpen(product)}>
                      View & customise
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              disabled={page >= (products.data.meta?.pages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <Empty
          title="No images found"
          description="Try another category or search."
        />
      )}
    </section>
  );
}
