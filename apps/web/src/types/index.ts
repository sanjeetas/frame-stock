export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}
export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
}
export interface Product {
  libraryCategory?: string;
  sourceProductId?: number;
  categoryIds?: number[];
  priceDisplay?: string;
  id: string;
  slug: string;
  title: string;
  category: string;
  group:
    | "Printing Products"
    | "Gifting Items"
    | "Customised Products"
    | "Image Library";
  price: number | null;
  unit: string;
  description: string;
  kind: "product" | "image";
  image: string;
  editable: boolean;
  published: boolean;
  bg: string;
  fg: string;
  variant: number;
  hasFile: boolean;
}
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}
export interface DesignSettings {
  headline: string;
  subtitle: string;
  bg: string;
  fg: string;
  font: "Georgia" | "Arial" | "monospace";
  size: number;
  y: number;
  square: boolean;
  hasUploadedImage: boolean;
  textX?: number;
  textY?: number;
  subtitleX?: number;
  subtitleY?: number;
  subtitleSize?: number;
  imageX?: number;
  imageY?: number;
  imageScale?: number;
  imageUploadId?: string;
  imageProductId?: string;
  baseProductId?: string;
}
export interface Design {
  id: string;
  title: string;
  settings: DesignSettings;
  updatedAt: string;
}
export interface CartItem {
  key: string;
  productId: string;
  title: string;
  unit: string;
  price: number | null;
  quantity: number;
  customization: { requirements: string; design?: DesignSettings };
}
export interface Order {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  items: {
    productId: string;
    title: string;
    kind: "product" | "image";
    unit: string;
    unitPrice: number | null;
    quantity: number;
    customization: CartItem["customization"];
  }[];
  total: number;
  needsQuote: boolean;
  status: "pending" | "confirmed" | "dispatched" | "completed" | "cancelled";
  createdAt: string;
}
