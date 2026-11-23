/** Replace only shipped magnet placeholders/reference photos, never admin uploads. */
export function productImage(product: { image?: string; title?: string; customisation?: { family?: string } }) {
  const image = product.image || "";
  if (product.customisation?.family !== "Magnets" || /calendar/i.test(product.title || "")) return image;
  const shipped = image === "assets/single-photo-magnet.svg" || image === "assets/custom-magnet.svg" ||
    (image.startsWith("https://cms.cloudinary.vpsvc.com/") && /magnet/i.test(image));
  if (!shipped) return image;
  return /acrylic/i.test(product.title || "") ? "assets/magnet-acrylic.webp"
    : /photo/i.test(product.title || "") ? "assets/magnet-photo.webp" : "assets/magnet-fridge.webp";
}
