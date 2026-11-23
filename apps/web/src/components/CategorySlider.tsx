import { ArrowUpRight } from "lucide-react";
import { PrintSlider, type PrintSlide } from "./PrintSlider";
import { useApiQuery } from "../hooks/useApiQuery";
import { Artwork } from "../features/catalog/Artwork";
import type { Product } from "../types";

// Key this component by its query so a newly selected category cannot inherit
// images, a slide index or a paused state from the previous category.
export function CategorySlider({ path, title, onOpen }: {
  path: string | null;
  title: string;
  onOpen: (product: Product) => void;
}) {
  const { data, loading, error } = useApiQuery<Product[]>(path);
  if (!path) return <PrintSlider />;

  const slides: PrintSlide[] = (data?.data || []).map((product, index) => ({
    id: product.id,
    title: product.title,
    content: (
      <div className="category-slide" data-colour={index % 3}>
        <div className="category-slide-copy">
          <p className="category-slide-category">{title}</p>
          <h3>{product.title}</h3>
          <button type="button" className="category-slide-action" onClick={() => onOpen(product)}>
            {product.editable ? "View & customise" : "View product"} <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="category-slide-art"><Artwork product={product} /></div>
      </div>
    ),
  }));

  if (!slides.length) slides.push({
    id: "category-status",
    title,
    content: <div className="category-slide category-slide-status" data-colour="0">
      <p className="category-slide-category">PHULO COLLECTION</p>
      <h3>{title}</h3>
      <p role="status">{loading ? "Loading category highlights…" : error ? "Category highlights are unavailable. Please retry the product list below." : "No products match this selection. Try another category or search."}</p>
    </div>,
  });

  return <PrintSlider category label={`${title} highlights`} slides={slides} />;
}
