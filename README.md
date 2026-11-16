# PHULO Multi Graphics

A Phulo storefront rebuild based on the public phulo.in site and the supplied product/service catalog. Includes 109 catalog entries, a stock-library search experience, custom design previews, WhatsApp order drafting, and a real backend admin panel.

## Deployment status and limits

GitHub Pages hosts the **frontend preview only**. It supports browsing, search, wishlist, cart, design editing, watermarked preview export and a WhatsApp order draft. It cannot execute the Node backend. On Pages, the admin page explains backend setup; it does not simulate a working login or store shared orders.

The included **Node 24 backend** adds secure admin sessions, shared catalog edits, public watermarked preview uploads, private originals, persistent order requests and admin-approved HD downloads. Run it on a host with a persistent writable disk. The storefront and backend must share the same origin; no credentials are placed in frontend code.

This is a custom implementation, not an export of the original WordPress installation or its private admin data. Exact source files, licensed theme/plugins, private HD resources and payment credentials were not supplied. Public category/product images are reference illustrations and are recorded in ASSET-SOURCES.md. The image library starts with eight original procedural sample artworks, not a licensed Shutterstock catalog. Prices for HD images remain “Request a quote” because no HD rates were supplied. Category images illustrate products; they are not guaranteed exact SKU photographs.

## Local backend

Requires Node 24 or later. No npm dependencies or installation step.

1. Set `ADMIN_PASSWORD` in your shell or hosting environment to a strong unique password. Do not commit it. No default admin password exists.
2. Run `npm start`.
3. Open http://localhost:3000 and http://localhost:3000/admin.html.
4. Run `npm test` and `npm run check` for validation.

By default SQLite data, original files and public previews are stored in ignored `data/`. Set `DATA_DIR` to your persistent disk path in production. Back this directory up. Set `NODE_ENV=production` behind HTTPS so session cookies are Secure. Admin sessions expire after 8 hours; login attempts are rate limited per network address. The application is intended for a single backend instance. A host-managed reverse proxy should provide TLS and request limits.

## Render / Docker deployment

A Dockerfile and Render blueprint are provided as one supported hosting option. Render's persistent disk plan is paid; no hosting purchase or deployment has been made automatically.

1. Connect this repository to a Docker-capable host (or create a Render Blueprint using render.yaml).
2. Set ADMIN_PASSWORD privately on the host. Configure an HTTPS URL.
3. Mount persistent storage at /app/data and use DATA_DIR=/app/data.
4. Launch the service. The backend serves both public/ and /api routes on its PORT.
5. Open /admin.html on the backend URL, sign in, and verify the catalog and uploads.

If using a custom domain, point it to this backend host after verification. The existing phulo.in WordPress website is not modified by this repository.

## Admin workflow

- Add/edit titles, groups, categories, descriptions, prices and units; hide or republish products.
- Upload a public PNG/JPEG/WebP preview up to 8 MB. For library images the uploader downsizes to 800 px and adds repeating PHULO watermarks. External preview URLs must be low resolution and already watermarked.
- Upload a private original up to 20 MB: PNG/JPEG/WebP, PDF, ZIP, PSD, AI, EPS or SVG. These originals are stored outside the public directory and served as attachment downloads only.
- Review order requests and customization settings; confirm the final quote with the customer.
- **Verify payment outside the site** before using “Payment verified — release HD link.” This marks the order completed and creates a random, expiring customer download link. Nothing charges a card automatically.
- Download links expire after 7 days. Issuing a new link, or changing status, revokes the prior link. One link serves the first digital item with an uploaded original; use separate orders for separate HD assets.

## Customer workflow

Printing → request quote on WhatsApp based on size, material and design.
Gifting → fixed catalog price; submit order request, confirm availability/payment/dispatch.
Customised products → edit text, colours, font, sizing, square format and your uploaded photo/logo; download watermarked PNG; save design parameters with the order.
Images → watermarked sample preview free; request HD quote; original released after manual payment verification.

The customizer exports a **watermarked preview**, not the HD licensed original or a PSD editor. Uploaded customer logo/photo pixels remain in their browser; only design parameters and an upload indicator are stored with an order. The customer must send their original separately when confirming the order. Saving a design does not auto-upload personal images.

## Catalog provenance

Product names, quoted prices, units and business contact details come from the supplied DOCX and the public Phulo website. Where they differ, the document price is used (e.g. Black Back White Flex Only ₹8/sq.ft, Acrylic China ₹30/sq.ft per mm). Unknown values are left as quotes. The source document itself is not committed to the public repository.

## Checks

The Node integration tests cover pricing, admin authentication, session revocation, origin checks, hidden products, server-side order totals, upload validation and protected/approved/revoked downloads. Syntax and static asset checks supplement these tests. Browser visual QA was unavailable in the managed environment; production appearance and canvas interactions need a browser check.
