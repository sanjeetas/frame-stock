import type { Product } from "../../types/index.ts";
import type { StudioDocument, StudioSide } from "./studioTypes.ts";

type Area = NonNullable<StudioDocument["printArea"]>;
export interface MockupSurface {
  front: string;
  back?: string;
  label: string;
  area: Area;
  tint: boolean;
}
const photo = (name: string) => `assets/mockups/${name}.webp`;
const chest: Area = { x: 0.35, y: 0.28, width: 0.3, height: 0.4 };
export function mockupSurface(product: Product): MockupSurface | undefined {
  const title = product.title.toLowerCase(),
    family = product.customisation?.family;
  if (family === "T-Shirts & Apparel") {
    let key = "crewneck",
      label = "Short-sleeve crew-neck",
      back = "crew-back",
      area = chest;
    if (/lab coat|overcoat/.test(title)) {
      key = /half sleeve/.test(title) ? "short-coat" : "lab-coat";
      label = "Lab coat / work coat";
      back = "";
      area = { x: 0.56, y: 0.32, width: 0.16, height: 0.18 };
    } else if (/apron/.test(title)) {
      key = "apron";
      label = "Bib apron";
      back = "";
      area = { x: 0.35, y: 0.3, width: 0.3, height: 0.3 };
    } else if (/sleeveless|safety vest/.test(title)) {
      key = /safety/.test(title) ? "safety-vest" : "vest";
      label = "Sleeveless vest";
      back = "";
      area = { x: 0.56, y: 0.3, width: 0.15, height: 0.18 };
    } else if (/puffer/.test(title)) {
      key = "puffer";
      label = "Quilted puffer jacket";
      back = "";
      area = { x: 0.57, y: 0.3, width: 0.14, height: 0.17 };
    } else if (/zipper hoodie/.test(title)) {
      key = "zip-hoodie";
      label = "Zip-up hoodie";
      back = "";
      area = { x: 0.56, y: 0.3, width: 0.16, height: 0.18 };
    } else if (/full.zip|fleece jacket/.test(title)) {
      key = "zip-jacket";
      label = "Full-zip jacket";
      back = "";
      area = { x: 0.56, y: 0.3, width: 0.16, height: 0.18 };
    } else if (/hoodie/.test(title)) {
      key = "hoodie";
      label = "Pullover hoodie";
      back = "hoodie-back";
      area = { x: 0.35, y: 0.35, width: 0.3, height: 0.23 };
    } else if (/sweatshirt/.test(title)) {
      key = "sweatshirt";
      label = "Crew-neck sweatshirt";
      back = "";
    } else if (/dress shirt|office shirt/.test(title)) {
      key = /half sleeve/.test(title) ? "short-shirt" : "dress-shirt";
      label = /half sleeve/.test(title)
        ? "Short-sleeve button shirt"
        : "Long-sleeve button shirt";
      back = "";
      area = { x: 0.56, y: 0.31, width: 0.16, height: 0.2 };
    } else if (/polo/.test(title)) {
      key = "polo";
      label = "Collared polo";
      back = "polo-back";
      area = { x: 0.35, y: 0.42, width: 0.3, height: 0.3 };
    } else if (/full sleeve/.test(title)) {
      key = "long-sleeve";
      label = "Long-sleeve crew-neck";
      back = "long-back";
    } else if (/women/.test(title)) {
      key = "women-crew";
      label = "Women's short-sleeve T-shirt";
      back = "";
    } else if (/kids/.test(title)) {
      key = "kids-crew";
      label = "Kids' short-sleeve T-shirt";
      back = "";
    }
    return {
      front: photo(key),
      back: back ? photo(back) : undefined,
      label,
      area,
      tint: true,
    };
  }
  if (family === "Mugs & Drinkware") {
    if (/bottle/.test(title))
      return {
        front: photo("bottle"),
        label: "Bottle front",
        area: { x: 0.42, y: 0.36, width: 0.17, height: 0.37 },
        tint: true,
      };
    if (/glass|beer|wine/.test(title))
      return {
        front: photo("glass"),
        label: "Glass engraving preview",
        area: { x: 0.4, y: 0.2, width: 0.2, height: 0.2 },
        tint: false,
      };
    if (/tumbler/.test(title))
      return {
        front: photo("tumbler"),
        label: "Tumbler front",
        area: { x: 0.36, y: 0.36, width: 0.28, height: 0.35 },
        tint: true,
      };
    return {
      front: photo("mug"),
      label: "Mug front",
      area: { x: 0.28, y: 0.36, width: 0.34, height: 0.32 },
      tint: true,
    };
  }
  if (family === "Bags") {
    if (/backpack|laptop bag/.test(title))
      return {
        front: photo("backpack"),
        label: "Backpack front pocket",
        area: { x: 0.35, y: 0.48, width: 0.3, height: 0.25 },
        tint: true,
      };
    if (/duffle/.test(title))
      return {
        front: photo("duffle"),
        label: "Duffle bag front",
        area: { x: 0.3, y: 0.43, width: 0.4, height: 0.25 },
        tint: true,
      };
    if (/sleeve/.test(title))
      return {
        front: photo("sleeve"),
        back: photo("sleeve"),
        label: "Laptop sleeve front",
        area: { x: 0.27, y: 0.3, width: 0.46, height: 0.4 },
        tint: true,
      };
    if (/bag cover/.test(title))
      return {
        front: photo("backpack"),
        label: "Bag cover branding placement",
        area: { x: 0.35, y: 0.48, width: 0.3, height: 0.25 },
        tint: true,
      };
    if (/tote|jute/.test(title))
      return {
        front: photo("tote"),
        back: photo("tote"),
        label: "Tote bag front",
        area: { x: 0.32, y: 0.45, width: 0.36, height: 0.32 },
        tint: true,
      };
  }
  if (family === "Photo Frames & Decor" && /clock/.test(title))
    return {
      front: photo("clock"),
      label: "Clock face",
      area: { x: 0.2, y: 0.14, width: 0.6, height: 0.72 },
      tint: false,
    };
  if (family === "Photo Frames & Decor" && /lamp/.test(title))
    return {
      front: photo("lamp"),
      label: "Photo lamp panel",
      area: { x: 0.29, y: 0.22, width: 0.42, height: 0.51 },
      tint: false,
    };
  if (family === "Photo Frames & Decor" && /acrylic|display stand/.test(title))
    return {
      front: photo("acrylic"),
      label: "Acrylic photo panel",
      area: { x: 0.27, y: 0.2, width: 0.46, height: 0.6 },
      tint: false,
    };
  if (family === "Photo Frames & Decor" && /frame|canvas print/.test(title))
    return {
      front: photo("frame"),
      label: "Photo frame",
      area: { x: 0.29, y: 0.2, width: 0.42, height: 0.6 },
      tint: true,
    };
  if (family === "Caps & Accessories") {
    if (/umbrella/.test(title))
      return {
        front: photo("umbrella"),
        label: "Umbrella front panel",
        area: { x: 0.35, y: 0.22, width: 0.3, height: 0.2 },
        tint: true,
      };
    if (/beanie/.test(title))
      return {
        front: photo("beanie"),
        label: "Beanie cuff",
        area: { x: 0.36, y: 0.62, width: 0.28, height: 0.15 },
        tint: true,
      };
    if (/chef/.test(title))
      return {
        front: photo("chef-hat"),
        label: "Chef hat band",
        area: { x: 0.36, y: 0.61, width: 0.28, height: 0.14 },
        tint: true,
      };
    return {
      front: photo("cap"),
      label: "Cap front panel",
      area: { x: 0.36, y: 0.29, width: 0.28, height: 0.2 },
      tint: true,
    };
  }
  if (
    (family === "Photo Gifts & Awards" ||
      family === "Calendars & Diaries" ||
      family === "Office Stationery") &&
    /album|notebook|diar|planner/.test(title)
  )
    return {
      front: photo("notebook"),
      back: photo("notebook"),
      label: "Book cover",
      area: { x: 0.29, y: 0.22, width: 0.42, height: 0.54 },
      tint: true,
    };
  if (family === "Photo Gifts & Awards") {
    if (/mouse/.test(title))
      return /round/.test(title)
        ? {
            front: photo("coaster"),
            label: "Round mousepad print surface",
            area: { x: 0.2, y: 0.14, width: 0.6, height: 0.72 },
            tint: false,
          }
        : {
            front: photo("mousepad"),
            label: "Mousepad print surface",
            area: { x: 0.21, y: 0.23, width: 0.58, height: 0.54 },
            tint: false,
          };
    if (/coaster/.test(title))
      return {
        front: photo("coaster"),
        label: "Coaster print face",
        area: { x: 0.2, y: 0.14, width: 0.6, height: 0.72 },
        tint: false,
      };
    if (/keychain/.test(title))
      return {
        front: photo("keychain"),
        label: "Keychain tag",
        area: { x: 0.35, y: 0.47, width: 0.3, height: 0.3 },
        tint: false,
      };
    if (/star.*award/.test(title))
      return {
        front: photo("star-award"),
        label: "Star award engraving",
        area: { x: 0.4, y: 0.35, width: 0.2, height: 0.23 },
        tint: false,
      };
    if (/award|plaque|memento/.test(title))
      return {
        front: photo("award"),
        label: "Award engraving panel",
        area: { x: 0.33, y: 0.23, width: 0.34, height: 0.42 },
        tint: false,
      };
    if (/pen drive|flash drive/.test(title))
      return {
        front: photo("usb"),
        label: "USB print panel",
        area: { x: 0.43, y: 0.42, width: 0.14, height: 0.32 },
        tint: false,
      };
    if (/hamper|kit/.test(title))
      return {
        front: photo("gift-box"),
        label: "Gift packaging branding",
        area: { x: 0.3, y: 0.4, width: 0.4, height: 0.25 },
        tint: false,
      };
  }
  if (family === "Pens & Card Holders" && /holder/.test(title))
    return {
      front: photo("cardholder"),
      label: "Card holder branding",
      area: { x: 0.27, y: 0.37, width: 0.46, height: 0.27 },
      tint: false,
    };
  if (family === "Pens & Card Holders" && /pens?$/.test(title))
    return {
      front: photo("pen"),
      label: "Pen barrel engraving",
      area: { x: 0.44, y: 0.25, width: 0.12, height: 0.5 },
      tint: false,
    };
  return undefined;
}
export function studioMockup(document: StudioDocument, side: StudioSide) {
  return side === "back" ? document.mockupBackImage : document.mockupImage;
}
export function fabricMockup(path = "") {
  return (
    /\/(crewneck|long-sleeve|polo|hoodie|dress-shirt|sweatshirt|zip-jacket|puffer|vest|apron|lab-coat|short-shirt|women-crew|kids-crew|zip-hoodie|short-coat|safety-vest|tote|backpack|duffle|sleeve|cap|beanie|chef-hat|umbrella)(-back)?\.webp$/.test(
      path,
    ) || /\/(crew-back|long-back|polo-back|hoodie-back)\.webp$/.test(path)
  );
}

export function mockupLighting(path = "") {
  return path.endsWith("/clock.webp") ? 1 : fabricMockup(path) ? 0.28 : 0;
}
