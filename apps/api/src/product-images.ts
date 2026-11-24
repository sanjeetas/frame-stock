/** Use cleaned PHULO website photos only for known shipped images; preserve admin uploads. */
const giftingPhotos: Record<number, { output: string; shipped: string[] }> = {
  29406: { output: "gift-jhula", shipped: ["assets/source-29406.png"] },
  29399: { output: "gift-heart", shipped: ["assets/source-29399.jpeg"] },
  29378: { output: "gift-lamp", shipped: ["assets/source-29378.jpeg"] },
  29314: { output: "gift-frame", shipped: ["assets/source-29314.webp", "https://m.media-amazon.com/images/I/71uEq90y3WL.jpg"] },
  29311: { output: "gift-mugs", shipped: ["assets/source-29311.webp", "https://cms.cloudinary.vpsvc.com/image/upload/if_ar_gt_1.1/c_scale%2Ct_pdpHeroGallery_Gallery/if_else/c_scale%2Cw_816/if_end/f_auto%2Cq_auto%3Abest%2Cdpr_1.0/India%20LOB/Unity%20PDP/Personalised%20Mugs/IN_Custom-Mug_Hero-image_01"] },
};
export function productImage(product: { image?: string; title?: string; group?: string; sourceProductId?: number; customisation?: { family?: string } }) {
  const image = product.image || "";
  const gift = product.group === "Gifting Items" ? giftingPhotos[product.sourceProductId || 0] : undefined;
  if (gift?.shipped.includes(image)) return `assets/${gift.output}.webp`;
  if (product.customisation?.family !== "Magnets" || /calendar/i.test(product.title || "")) return image;
  const shipped = image === "assets/single-photo-magnet.svg" || image === "assets/custom-magnet.svg" ||
    (image.startsWith("https://cms.cloudinary.vpsvc.com/") && /magnet/i.test(image));
  if (!shipped) return image;
  return /acrylic/i.test(product.title || "") ? "assets/magnet-acrylic.webp"
    : /photo/i.test(product.title || "") ? "assets/magnet-photo.webp" : "assets/magnet-fridge.webp";
}
