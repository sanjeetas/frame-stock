import type { Product } from "../../types";
import { money } from "../../lib/utils";

export function Price({ product }: { product: Product }) {
  if (product.group === "Gifting Items") {
    return <>Price based on discussion</>;
  }
  if (product.customisation?.quoteRequired) return <>Price on request</>;
  const label = product.priceDisplay || "";
  const amounts = [...label.matchAll(/₹\s*([\d,]+(?:\.\d+)?)/g)].map((match) =>
    Number(match[1]!.replaceAll(",", "")),
  );
  if (
    amounts.length === 2 &&
    !label.includes("–") &&
    amounts[0]! > amounts[1]! &&
    amounts[1] === product.price
  ) {
    return (
      <>
        <span className="sr-only">Original price: </span>
        <del className="mr-2 font-normal text-slate-500">
          {money(amounts[0]!)}
        </del>
        <span className="sr-only">Sale price: </span>
        <span>{money(product.price)}</span>
      </>
    );
  }
  return <>{label || money(product.price)}</>;
}
