# PHULO Multi Graphics — MERN

PHULO catalog, image-library/customizer, customer accounts and admin operations built with React + TypeScript + Tailwind CSS, shadcn-style UI components/Radix primitives and Lucide; Express + TypeScript, Mongoose and MongoDB on the backend. The prior plain-JavaScript/SQLite server and admin-password login have been removed, including their legacy authentication endpoints.

## Quick setup

Requires Node 24+, npm and MongoDB with transaction support (Atlas or a replica set). The lockfile pins compatible stable dependencies.

```sh
npm ci
cp .env.example .env
# Edit .env: fill TWO independent ACCESS_TOKEN_SECRET and CSRF_SECRET values.
# Generate each separately:
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
# Start a local MongoDB replica set; its port is bound to loopback only.
docker compose up -d --wait mongo
npm run seed
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to Express at http://localhost:3000. The frontend reads/writes actual APIs and MongoDB. There is no local catalog fallback, fake login, or simulated order success when the backend is unavailable.

To create the first admin, set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique 12–128 character `ADMIN_PASSWORD` in the ignored `.env`, then run:

```sh
npm run admin:create
```

Remove the bootstrap admin password from the environment afterward. Existing accounts are never silently promoted or overwritten. Public registration only creates `user` accounts and rejects role/owner/userId inputs.

## Environment variables

| Variable                                      | Purpose                                                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`                                 | Atlas connection string or local replica-set URI. Standalone MongoDB is insufficient for atomic refresh-token rotation.            |
| `ACCESS_TOKEN_SECRET`                         | Independent random signing secret, at least 32 characters.                                                                         |
| `CSRF_SECRET`                                 | Separate random CSRF signing secret, at least 32 characters.                                                                       |
| `FRONTEND_ORIGIN`                             | Exact frontend origin; default `http://localhost:5173`. HTTPS is required in production.                                           |
| `PORT`                                        | Express port, default `3000`.                                                                                                      |
| `NODE_ENV`                                    | `development`, `test`, or `production`. Production cookies are Secure.                                                             |
| `ACCESS_TOKEN_TTL_SECONDS`                    | Default 600; maximum 900.                                                                                                          |
| `REFRESH_TOKEN_TTL_DAYS`                      | Absolute session lifetime; default 7, maximum 30.                                                                                  |
| `COOKIE_SAME_SITE`                            | `lax` by default. `none` requires production HTTPS.                                                                                |
| `TRUST_PROXY_HOPS`                            | Default 0. Set to the exact number of trusted ingress proxies only when direct backend access is controlled.                       |
| `UPLOAD_STORAGE_LIMIT_MB`                     | GridFS upload budget; default and maximum 400 MB to leave space for users, orders, indexes and metadata in the Atlas free cluster. |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by the explicit bootstrap command. Not a server login bypass.                                                            |
| `VITE_API_BASE_URL`                           | Optional frontend build variable, default `/api`. Set in `apps/web/.env` or build environment for a remote API.                    |
| `VITE_BASE_PATH`                              | Frontend asset base, default `/`. The Pages workflow uses `/frame-stock/`.                                                         |

Do not place any server secret in `VITE_*` variables. Frontend build variables are public. Both example environment files are provided; real `.env` files are ignored.

## Structure

```text
apps/api/src/
  config/         environment and MongoDB setup
  models/         users, sessions, refresh hashes, products, orders, designs
  schemas/        strict Zod params/query/body validation
  middleware/     authenticate, authorizeRoles, CSRF, errors, validation
  controllers/    HTTP handlers and explicit response DTOs
  services/       authentication, ownership, catalog/orders/files/design logic
  routes/         public, authenticated and explicitly admin-only endpoints
  scripts/        catalog seed and explicit admin creation
apps/api/tests/   integration tests using a real temporary MongoDB replica set
apps/web/src/
  components/ui/  reusable shadcn-style Button, Input, Card and Dialog
  features/       auth, catalog, design editor, customer orders and admin
  hooks/          API query lifecycle and debounced input
  lib/            typed API client, cookie/CSRF handling and helpers
  types/          frontend request/display types
public/           existing reference assets and seed catalog (no private files)
```

## Authentication and authorization

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/csrf`.
- Passwords are Argon2id hashes (64 MiB, 3 iterations, parallelism 1), never plaintext. Login uses a dummy Argon2 hash when an email is absent and a generic invalid-credentials response.
- Short-lived JWT access cookies and opaque rotating refresh cookies are HttpOnly; both are Secure in production. Refresh cookies are scoped to `/api/auth`; neither token appears in JSON, localStorage, sessionStorage or JavaScript state.
- Only refresh-token SHA-256 hashes are stored. Rotation consumes the old hash and inserts its successor in a MongoDB transaction. Reusing a consumed token revokes the entire login-session family. Sessions have an absolute expiry; TTL indexes clean up expired records.
- Every authenticated request verifies the JWT, its live session and the active MongoDB user. Roles come from that user record; role changes and logout/replay revocation affect existing access cookies immediately. Logout revokes the current session even when only its valid access cookie remains.
- Mutating cookie-authenticated endpoints require an exact allowed Origin plus `X-CSRF-Token`. Fetch the signed token from `/api/auth/csrf`, retaining the HttpOnly CSRF cookie. The React API client handles this and refresh rotation automatically, with per-tab single-flight and browser Web Locks where available.
- Missing/expired/invalid identity returns 401. Wrong role or another user’s owned resource returns 403. Admins do not get a blanket ownership bypass.
- Helmet headers, exact-origin credentialed CORS, bounded JSON/raw uploads, and global/login/register/refresh/write rate limits are configured. Rate-limit stores are per-process; use a shared store before scaling to multiple API instances.

## Resource APIs and permissions

All list responses include `meta: { page, limit, total, pages }`. Success responses use `{ success: true, data, meta? }`; errors use `{ success: false, error: { code, message, issues? } }`. Stack traces, password hashes, token hashes and private file paths are excluded.

| Endpoint                                                               | Access                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET /api/products`, `GET /api/products/:id`                           | Public, published catalog only; pagination/search/category/group/sort.                                |
| `GET/POST /api/orders`, `GET /api/orders/:id`                          | Signed-in user; only their own orders. Server calculates prices from catalog records.                 |
| `PATCH /api/orders/:id/cancel`                                         | Owner; pending orders only.                                                                           |
| `GET /api/orders/:id/download/:itemIndex`                              | Authenticated owner of a completed order; original must be uploaded. No public bearer-download links. |
| `GET/POST /api/designs`, `GET/PATCH/DELETE /api/designs/:id`           | Owner only, including when caller is an admin.                                                        |
| `GET/POST /api/admin/products`, `PATCH/DELETE /api/admin/products/:id` | Explicit admin permission. Delete hides the item.                                                     |
| `POST /api/admin/products/:id/preview`                                 | Admin; octet-stream PNG/JPEG/WebP ≤8 MB. Server resizes and watermarks library previews.              |
| `POST /api/admin/products/:id/file?filename=…`                         | Admin; octet-stream original ≤20 MB, stored privately in MongoDB GridFS.                              |
| `GET /api/admin/orders`, `PATCH /api/admin/orders/:id`                 | Explicit admin permission to review and update order status.                                          |
| `GET /api/previews/:filename`                                          | Public raster previews only.                                                                          |

Admins verify payment outside the application before marking an order `completed`. There is no automatic payment gateway. Original HD/PSD files were not supplied; the library contains original sample artwork, and uploaded original files are needed for real HD downloads. Watermarked preview/custom PNG downloads work without an HD license. Customer photo/logo pixels stay in their browser; design parameters can be stored in MongoDB and attached to orders. A canvas proof is not a PSD editor.

## Verification

```sh
npm run check
npm test
npm run build
```

Tests use a real ephemeral MongoDB 8 replica set through mongodb-memory-server, not mocked Mongoose calls. The first test run downloads a MongoDB binary into ignored `.cache/mongodb`; optionally set `MONGOMS_DOWNLOAD_DIR` to an existing compatible binary cache. No production database or secrets are needed for tests.

Coverage includes Argon2id/password redaction, register/login/me/refresh/logout, cookie flags, missing/forged/expired tokens, refresh replay and concurrent reuse, session expiry, live role changes, wrong-role access, cross-user read/update/delete denial, CSRF/origin rejection, validation/rate limits, server-priced orders, protected HD downloads, literal search, idempotent catalog seeding, GridFS persistence/replacement/deletion, storage quota enforcement, and one-time admin bootstrap.

Production builds and TypeScript checks supplement these flows. Browser visual/interaction QA was unavailable in the managed environment.

## Production and GitHub Pages

The initial deployment uses **Render Free + MongoDB Atlas Free**, with no paid service or persistent disk. Public previews and private originals are stored in separate MongoDB GridFS buckets, so uploaded files survive Render restarts, redeploys and idle sleep. Uploads reserve space atomically against a 400 MB application budget; replacing/removing an original reclaims space. The admin dashboard displays usage. This leaves headroom in the Atlas free cluster; monitor Atlas storage separately because account/session/index data is outside the upload budget.

Free Render instances sleep after 15 minutes of inactivity and may take about a minute to wake. Monthly service-hour, bandwidth and build allowances apply. This is an initial preview tier, not an always-on production service. No automatic paid upgrades are configured.

The Express server serves React and the API on one HTTPS origin. On Render, the origin is derived from the verified `RENDER_EXTERNAL_URL` environment variable unless `FRONTEND_ORIGIN` is explicitly supplied (required when adding a custom domain).

```sh
npm run build
npm start
# For a production image without dev dependencies, bootstrap via compiled scripts:
node --env-file-if-exists=.env apps/api/dist/scripts/seed.js
node --env-file-if-exists=.env apps/api/dist/scripts/create-admin.js
```

`render.yaml` explicitly selects `plan: free` and has no disk. It generates signing/CSRF secrets and an initial admin password privately in Render. `AUTO_SEED=true` idempotently seeds the catalog during startup. `BOOTSTRAP_ADMIN=true` creates the configured admin once and never promotes existing customer accounts or overwrites an existing admin password. The initial admin email is the PHULO business address. Reveal its generated `ADMIN_PASSWORD` only in your Render service’s Environment page; it is not written to GitHub or chat. After provisioning, disable `BOOTSTRAP_ADMIN` and remove its password variable if you do not need automatic re-provisioning.

Atlas access must allow the deployed service's outbound addresses. Use Render's verified current outbound ranges for the service; do not guess region IPs or broaden an existing project's access list. The app database user is limited to read/write on the dedicated PHULO database.

GitHub Pages only serves the built React frontend. Set repository Actions variable `VITE_API_BASE_URL` to the deployed API URL, then rebuild. A cross-site API requires the Pages origin in `FRONTEND_ORIGIN` and `SameSite=None; Secure`; browser third-party-cookie restrictions can prevent that setup, so same-origin hosting is recommended. Without a backend, Pages displays a clear API connection error instead of fake catalog or authentication success.

The original phulo.in WordPress website is not modified. No original WordPress database/private admin was imported. Existing public reference images and catalog data are preserved; see [ASSET-SOURCES.md](ASSET-SOURCES.md).

## Category and product imagery

Catalog image references use product-specific previews matched against the PHULO storefront and visually reviewed. Magnetic sign and MDF cut-panel examples have separately recorded public reference sources; the rate-card preview is an original generated SAMPLE DESIGN mockup. See ASSET-SOURCES.md. Home category thumbnails show the corresponding printed product type. Library sample artwork uses category-specific nature, landscape, floral, business, festival, wedding and abstract illustrations.

On startup, catalog-image-corrections.json replaces only the known previous default image for each catalog slug. It does not overwrite admin-uploaded/custom image URLs or modify prices, availability, customer orders, private originals or other product fields.

### Source catalogue and categories

`public/catalog.json` contains the imported PHULO catalogue with WooCommerce source IDs, exact numeric prices, displayed prices/ranges, product order and category memberships. `public/categories.json` preserves the 26-category taxonomy. The API exposes `/api/categories` and `/api/products?categoryId=231`; parent category filters include descendants. The source snapshot is applied once on startup (`sourceVersion: phulo-source-v1`), keeping existing product IDs and order references. Later admin edits survive restarts; new source changes require an explicit new import/version. Eight demonstration image designs remain in the admin catalogue but are unpublished so the public source catalogue has 122 products.

### Image library and saved image proofs

The dedicated `#library` page uses `/api/library` and `/api/library/categories`, with its own keyword/category/price sorting. Startup seeds 12 PHULO original digital illustrations at ₹99 per HD license (admin-editable); these are original illustrations, not a mirrored Shutterstock photo catalogue. Private 2400×1600 originals are stored in GridFS and public previews are watermarked. `/api/library/:id/license` creates a digital-only request; `#downloads` lists digital requests and uses the existing owner-checked, payment-verified original download endpoint. Payment confirmation remains the existing admin workflow. Printing requests are listed separately.

`POST /api/design-images` accepts authenticated, CSRF-protected PNG/JPEG/WebP uploads up to 8 MB/25 megapixels, stores a resized private proof in GridFS, and returns an owned image ID. Saved settings retain `baseProductId`, `imageProductId`, and/or `imageUploadId`. Both save-design and order APIs reject another user's upload ID. The shared proof canvas loads selected product/library images and saved uploads, so the product View, editor and My designs use the same image references. Exported edited proofs remain watermarked. Account uploads are capped at 30 and share the existing 400 MB storage budget.

### Direct placement in the product editor

Select a headline, supporting text, or added image on the preview and drag it with mouse/touch. Double-click text (or choose Edit selected text) to focus its editable field. Arrow keys move by one proof pixel; Shift moves by ten. Horizontal/vertical sliders provide an alternative, and image size preserves the image's aspect ratio. Each layer's percentage coordinates and image scale are validated by the API and saved in the design/order settings. Older proofs keep their previous default positions. Selection outlines are HTML overlays, so they are excluded from exported PNGs.
