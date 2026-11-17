import sharp from "sharp";
import { Product } from "../models/product.model.js";
import { saveOriginal, savePreview, deleteOriginal } from "./file.service.js";
import type { Config } from "../config/env.js";
const categories = [
  "Nature",
  "Landscapes",
  "Flowers",
  "Abstract",
  "Business",
  "Festivals",
  "Wedding",
  "Food",
  "Animals",
  "Travel",
  "Technology",
  "Backgrounds",
];
function artwork(index: number) {
  const palettes = [
    ["#99e5db", "#116c54", "#ffda81"],
    ["#bce0f9", "#326995", "#fcbf7c"],
    ["#ffe4f1", "#b31d63", "#6ba77b"],
    ["#e4dbff", "#6542aa", "#ffb06a"],
  ];
  const [bg, ink, accent] = palettes[index % 4]!;
  let shapes = "";
  if ([0, 1, 9].includes(index)) {
    shapes = `<circle cx="1710" cy="390" r="160" fill="${accent}"/><path d="M0 1200L650 380L1150 1100L1680 540L2400 1320V1600H0Z" fill="${ink}" opacity=".65"/><path d="M0 1420Q600 900 1250 1370T2400 1120V1600H0Z" fill="${ink}"/>`;
    for (let i = 0; i < 16; i++)
      shapes += `<path d="M${100 + i * 145} 1440v-210m-65 100 65-170 65 170Z" stroke="${bg}" fill="${ink}" stroke-width="8"/>`;
  } else if ([2, 6].includes(index)) {
    for (let i = 0; i < 22; i++) {
      const x = 120 + ((i * 331) % 2180),
        y = 120 + ((i * 237) % 1360);
      shapes += `<g transform="translate(${x} ${y})"><path d="M0 0Q120 130 40 280" fill="none" stroke="${ink}" stroke-width="8"/>${Array.from({ length: 6 }, (_, j) => `<ellipse rx="36" ry="95" transform="rotate(${j * 60}) translate(0 -60)" fill="${j % 2 ? accent : ink}" opacity=".8"/>`).join("")}<circle r="30" fill="${bg}"/></g>`;
    }
  } else if (index === 8) {
    for (let i = 0; i < 8; i++)
      shapes += `<g transform="translate(${250 + (i % 4) * 580} ${400 + Math.floor(i / 4) * 750})"><ellipse cy="100" rx="140" ry="175" fill="${ink}"/><circle cx="-85" cy="-80" r="60" fill="${ink}"/><circle cx="85" cy="-80" r="60" fill="${ink}"/><circle r="140" fill="${accent}"/><circle cx="-45" cy="-10" r="13" fill="${ink}"/><circle cx="45" cy="-10" r="13" fill="${ink}"/><ellipse cy="55" rx="30" ry="23" fill="${ink}"/></g>`;
  } else if (index === 7) {
    for (let i = 0; i < 12; i++) {
      const x = 180 + (i % 4) * 650,
        y = 250 + Math.floor(i / 4) * 590;
      shapes += `<g transform="translate(${x} ${y})"><circle r="175" fill="#f0a526"/><circle r="150" fill="#fff0a6"/><circle r="135" fill="#efaf24"/>${Array.from({ length: 8 }, (_, j) => `<path d="M0 0L0 -130A130 130 0 0 1 92 -92Z" fill="#ffe263" stroke="#fff5ba" stroke-width="7" transform="rotate(${j * 45})"/>`).join("")}<path d="M15 -160Q80 -270 160 -170Q100 -120 15 -160" fill="#418553"/></g>`;
    }
  } else if (index === 4) {
    for (let i = 0; i < 9; i++) {
      const x = i * 290,
        h = 450 + (i % 4) * 190;
      shapes += `<rect x="${x}" y="${1600 - h}" width="245" height="${h}" rx="12" fill="${i % 2 ? ink : accent}"/>`;
      for (let w = 0; w < 3; w++)
        for (let r = 0; r < 6; r++)
          shapes += `<rect x="${x + 35 + w * 65}" y="${1650 - h + r * 60}" width="30" height="28" fill="${bg}"/>`;
    }
  } else if (index === 5) {
    for (let i = 0; i < 14; i++) {
      const x = 90 + ((i * 391) % 2200),
        y = 200 + ((i * 337) % 1000);
      shapes += `<g transform="translate(${x} ${y})"><path d="M0 -300V-100" stroke="${ink}" stroke-width="5"/><ellipse rx="90" ry="120" fill="${i % 2 ? ink : accent}"/><path d="M0 -115V115M-35 -105Q-80 0 -35 105M35 -105Q80 0 35 105" fill="none" stroke="${bg}" stroke-width="6"/><path d="M-30 115H30M0 120V190" stroke="${ink}" stroke-width="10"/></g>`;
    }
  } else if (index === 10) {
    for (let i = 0; i < 20; i++) {
      const y = 60 + i * 80;
      shapes += `<path d="M0 ${y}H${300 + i * 40}L${430 + i * 40} ${y + 100}H${1700 - i * 20}L${1800 - i * 20} ${y}H2400" fill="none" stroke="${i % 2 ? ink : accent}" stroke-width="9"/><circle cx="${800 + i * 41}" cy="${y + 100}" r="22" fill="${bg}" stroke="${ink}" stroke-width="7"/>`;
    }
  } else {
    for (let i = 0; i < 35; i++) {
      const x = (i * 347) % 2400,
        y = (i * 229) % 1600;
      shapes += `<g transform="translate(${x} ${y}) rotate(${i * 17})"><rect x="-70" y="-70" width="${100 + (i % 4) * 40}" height="${100 + (i % 3) * 60}" rx="${index === 10 ? 12 : 60}" fill="${i % 2 ? ink : accent}" opacity=".75"/><circle cx="40" cy="50" r="${30 + (i % 4) * 12}" fill="${bg}" opacity=".6"/></g>`;
    }
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${bg}"/><stop offset="1" stop-color="white"/></linearGradient></defs><rect width="2400" height="1600" fill="url(#bg)"/>${shapes}</svg>`,
  );
}
export async function seedImageLibrary(config: Config) {
  for (const [index, category] of categories.entries()) {
    const slug = `library-original-${category.toLowerCase()}`;
    if (await Product.exists({ slug })) continue;
    const product = await Product.create({
      slug,
      title: `${category} — original illustration`,
      category,
      libraryCategory: category,
      group: "Image Library",
      price: 99,
      unit: "HD license",
      kind: "image",
      editable: true,
      published: false,
      description:
        "Original PHULO digital illustration. 2400 × 1600 PNG. Free watermarked preview; HD personal/commercial-use license after payment confirmation. Redistribution or resale of the standalone image is not included.",
    });
    try {
      const png = await sharp(artwork(index)).png().toBuffer();
      await saveOriginal(
        String(product._id),
        png,
        `phulo-${category.toLowerCase()}-2400x1600.png`,
        config,
      );
      await savePreview(String(product._id), png, config);
      await Product.updateOne(
        { _id: product._id },
        { $set: { published: true } },
      );
    } catch (error) {
      await deleteOriginal(String(product._id)).catch(() => undefined);
      await Product.deleteOne({ _id: product._id });
      throw error;
    }
  }
}
