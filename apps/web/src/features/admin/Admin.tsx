import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Plus, Upload } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { api } from "../../lib/api";
import { money } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Input, Textarea } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Field } from "../../components/Field";
import { Loading, ErrorState, Empty } from "../../components/Feedback";
import { Card } from "../../components/ui/card";
import type { Product, Order } from "../../types";
const productSchema = z.object({
  libraryCategory: z.string().max(60).optional(),
  title: z.string().trim().min(1).max(150),
  category: z.string().trim().min(1).max(100),
  group: z.enum([
    "Printing Products",
    "Gifting Items",
    "Customised Products",
    "Image Library",
  ]),
  price: z.number().min(0).nullable(),
  unit: z.string().min(1).max(30),
  description: z.string().max(2000),
  image: z.string().max(2000),
  editable: z.boolean(),
  published: z.boolean(),
  bg: z.string(),
  fg: z.string(),
  variant: z.number(),
});
export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("products"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [orderPage, setOrderPage] = useState(1),
    [status, setStatus] = useState(""),
    [editing, setEditing] = useState<Product | null>(null),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(""),
    [productError, setProductError] = useState("");
  const q = useDebouncedValue(search),
    allowed = user?.role === "admin";
  const products = useApiQuery<Product[]>(
      allowed
        ? `/admin/products?page=${page}&limit=15&search=${encodeURIComponent(q)}`
        : null,
    ),
    orders = useApiQuery<Order[]>(
      allowed
        ? `/admin/orders?page=${orderPage}&limit=10${status ? "&status=" + status : ""}`
        : null,
    );
  const storage = useApiQuery<{ usedBytes: number; limitBytes: number }>(
    allowed ? "/admin/storage" : null,
  );
  async function removeOriginal() {
    if (
      !editing ||
      !window.confirm(
        "Remove this private original? Existing paid orders cannot download it until a replacement is uploaded.",
      )
    )
      return;
    setBusy(true);
    setProductError("");
    try {
      await api("/admin/products/" + editing.id + "/file", {
        method: "DELETE",
      });
      setEditing({ ...editing, hasFile: false });
      products.reload();
      storage.reload();
      setSuccess("Private original removed.");
    } catch (error) {
      setProductError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function hide(p: Product) {
    setBusy(true);
    setError("");
    try {
      await api("/admin/products/" + p.id, { method: "DELETE" });
      products.reload();
      setSuccess("Product hidden.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function updateOrder(o: Order, next: string) {
    setError("");
    setBusy(true);
    try {
      await api("/admin/orders/" + o.id, {
        method: "PATCH",
        body: { status: next },
      });
      orders.reload();
      setSuccess("Order status updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProductError("");
    const form = new FormData(e.currentTarget),
      raw = Object.fromEntries(form);
    const parsed = productSchema.safeParse({
      libraryCategory:
        raw.group === "Image Library"
          ? String(raw.libraryCategory || raw.category)
          : undefined,
      title: raw.title,
      category: raw.category,
      group: raw.group,
      price: raw.price === "" ? null : Number(raw.price),
      unit: raw.unit,
      description: raw.description,
      image: raw.image,
      editable: raw.editable === "on",
      published: raw.published === "on",
      bg: editing?.bg || "#e7ecd9",
      fg: editing?.fg || "#365044",
      variant: editing?.variant || 0,
    });
    if (!parsed.success) {
      setProductError(
        parsed.error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join(" "),
      );
      return;
    }
    const original = form.get("original") as File,
      preview = form.get("preview") as File;
    if (original?.size > 20 * 1024 * 1024 || preview?.size > 8 * 1024 * 1024) {
      setProductError("Original maximum: 20 MB. Preview maximum: 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<Product>(
        editing ? "/admin/products/" + editing.id : "/admin/products",
        { method: editing ? "PATCH" : "POST", body: parsed.data },
      );
      setEditing(result.data);
      if (preview?.size)
        await api("/admin/products/" + result.data.id + "/preview", {
          method: "POST",
          raw: preview,
        });
      if (original?.size)
        await api(
          "/admin/products/" +
            result.data.id +
            "/file?filename=" +
            encodeURIComponent(original.name),
          { method: "POST", raw: original },
        );
      setOpen(false);
      products.reload();
      storage.reload();
      setSuccess("Product and selected files saved.");
    } catch (e) {
      setProductError(
        (e as Error).message +
          " If an upload failed, the product itself may already be saved; retry to finish it.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <section className="mx-auto max-w-7xl p-10">
        <ErrorState
          message={
            user
              ? "Admin access is required."
              : "Sign in with an admin account to continue."
          }
        />
      </section>
    );
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <p className="text-xs tracking-widest text-cyan-700">PHULO OPERATIONS</p>
      <h1 className="mt-2 mb-6 text-3xl font-bold">Admin dashboard</h1>
      {storage.data && (
        <p className="mb-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          Library storage:{" "}
          {(storage.data.data.usedBytes / 1024 / 1024).toFixed(1)} MB of{" "}
          {Math.round(storage.data.data.limitBytes / 1024 / 1024)} MB · Files
          are stored in MongoDB and survive server restarts.
        </p>
      )}
      <div className="mb-6 flex gap-3">
        <Button
          variant={tab === "products" ? "default" : "outline"}
          onClick={() => setTab("products")}
        >
          Products & images
        </Button>
        <Button
          variant={tab === "orders" ? "default" : "outline"}
          onClick={() => setTab("orders")}
        >
          Orders & HD access
        </Button>
      </div>
      {error && <ErrorState message={error} />}
      {success && (
        <p
          role="status"
          className="my-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {success}
        </p>
      )}
      {tab === "products" ? (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <Input
              className="max-w-sm"
              aria-label="Search catalog"
              placeholder="Search products…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Button
              onClick={() => {
                setEditing(null);
                setProductError("");
                setOpen(true);
              }}
            >
              <Plus size={20} />
              Add product / image
            </Button>
          </div>
          {products.loading ? (
            <Loading />
          ) : products.error ? (
            <ErrorState message={products.error} retry={products.reload} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Product",
                      "Category",
                      "Price",
                      "Visibility",
                      "Original",
                      "Actions",
                    ].map((h) => (
                      <th key={h} className="p-4 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.data?.data.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="p-4 font-medium">{p.title}</td>
                      <td className="p-4">{p.category}</td>
                      <td className="p-4">{money(p.price)}</td>
                      <td className="p-4">
                        {p.published ? "Published" : "Hidden"}
                      </td>
                      <td className="p-4">{p.hasFile ? "Uploaded" : "—"}</td>
                      <td className="flex gap-2 p-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing(p);
                            setProductError("");
                            setOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {p.published && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => hide(p)}
                          >
                            Hide
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!products.data?.data.length && (
                <Empty
                  title="No products"
                  description="Add a product or run the catalog seed command."
                />
              )}
            </div>
          )}
          <Pagination
            page={page}
            pages={products.data?.meta?.pages || 1}
            setPage={setPage}
          />
        </>
      ) : (
        <>
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900">
            Verify the final quote and payment outside this site before marking
            an order completed. Completed orders unlock uploaded HD originals
            only for that order’s authenticated owner. No automatic payment
            gateway is configured.
          </div>
          <select
            aria-label="Filter orders by status"
            className="mb-5"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOrderPage(1);
            }}
          >
            <option value="">All statuses</option>
            {[
              "pending",
              "confirmed",
              "dispatched",
              "completed",
              "cancelled",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {orders.loading ? (
            <Loading />
          ) : orders.error ? (
            <ErrorState message={orders.error} retry={orders.reload} />
          ) : orders.data?.data.length ? (
            <div className="space-y-4">
              {orders.data.data.map((o) => (
                <Card key={o.id}>
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      {o.name} · {o.phone}
                    </h3>
                    <span className="text-xs text-slate-500">{o.id}</span>
                  </div>
                  <p className="my-2 text-xs text-slate-500">{o.address}</p>
                  {o.items.map((i, index) => (
                    <div key={index} className="my-3 text-sm">
                      <p>
                        {i.title} × {i.quantity}
                      </p>
                      <p className="text-xs text-slate-500">
                        {i.customization.requirements}
                      </p>
                      {i.customization.design && (
                        <pre className="mt-2 max-w-full overflow-x-auto rounded bg-slate-50 p-2 text-sm">
                          {JSON.stringify(i.customization.design, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                  <p className="my-4 text-sm font-semibold">
                    {money(o.total)}
                    {o.needsQuote ? " + quote items" : ""}
                  </p>
                  <p className="mb-4 text-xs text-slate-500">{o.notes}</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void updateOrder(
                        o,
                        String(new FormData(e.currentTarget).get("status")),
                      );
                    }}
                    className="flex flex-wrap items-center gap-3"
                  >
                    <select
                      name="status"
                      aria-label={"Status for order " + o.id}
                      defaultValue={o.status}
                    >
                      {[
                        "pending",
                        "confirmed",
                        "dispatched",
                        "completed",
                        "cancelled",
                      ].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <Button size="sm" disabled={busy}>
                      Save status
                    </Button>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" required />I verified any payment
                      needed for completion
                    </label>
                  </form>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              title="No orders yet"
              description="Customer order requests will appear here."
            />
          )}
          <Pagination
            page={orderPage}
            pages={orders.data?.meta?.pages || 1}
            setPage={setOrderPage}
          />
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent>
          <DialogTitle className="text-2xl font-bold">
            {editing ? "Edit product" : "Add product / image"}
          </DialogTitle>
          <DialogDescription className="my-3 text-sm text-slate-500">
            Original files are private. Library preview uploads are resized and
            watermarked on the server.
          </DialogDescription>
          <form onSubmit={saveProduct} className="space-y-4">
            <Field label="Title">
              {(id) => (
                <Input
                  id={id}
                  name="title"
                  required
                  defaultValue={editing?.title}
                  maxLength={150}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Group">
                {(id) => (
                  <select
                    id={id}
                    name="group"
                    className="w-full"
                    defaultValue={editing?.group}
                  >
                    {[
                      "Printing Products",
                      "Gifting Items",
                      "Customised Products",
                      "Image Library",
                    ].map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Category">
                {(id) => (
                  <Input
                    id={id}
                    name="category"
                    required
                    defaultValue={editing?.category}
                    maxLength={100}
                  />
                )}
              </Field>
            </div>
            <Field
              label="Image Library category (for Image Library products)"
              hint="Examples: Nature, Landscapes, Flowers, Business, Abstract."
            >
              {(id) => (
                <Input
                  id={id}
                  name="libraryCategory"
                  maxLength={60}
                  defaultValue={editing?.libraryCategory || ""}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="INR price (blank = quote)">
                {(id) => (
                  <Input
                    id={id}
                    name="price"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={editing?.price ?? ""}
                  />
                )}
              </Field>
              <Field label="Unit">
                {(id) => (
                  <Input
                    id={id}
                    name="unit"
                    required
                    defaultValue={editing?.unit || "item"}
                    maxLength={30}
                  />
                )}
              </Field>
            </div>
            <Field label="Description">
              {(id) => (
                <Textarea
                  id={id}
                  name="description"
                  defaultValue={editing?.description}
                  maxLength={2000}
                />
              )}
            </Field>
            <Field label="Public preview URL">
              {(id) => (
                <Input
                  id={id}
                  name="image"
                  defaultValue={editing?.image}
                  maxLength={2000}
                />
              )}
            </Field>
            <Field label="Upload preview (PNG, JPEG, WebP; max 8 MB)">
              {(id) => (
                <Input
                  id={id}
                  name="preview"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                />
              )}
            </Field>
            <Field label="Upload private original (max 20 MB)">
              {(id) => (
                <Input
                  id={id}
                  name="original"
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,.pdf,.zip,.psd,.ai,.eps,.svg"
                />
              )}
            </Field>
            <p className="text-xs text-slate-500">
              {editing?.hasFile
                ? "An original is uploaded. A new upload replaces it."
                : "No original file uploaded yet."}
            </p>
            {editing?.hasFile && (
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={removeOriginal}
              >
                Remove private original
              </Button>
            )}
            <div className="flex gap-6 text-sm">
              <label className="flex items-center gap-2">
                <input
                  name="editable"
                  type="checkbox"
                  defaultChecked={editing?.editable}
                />
                Customisable
              </label>
              <label className="flex items-center gap-2">
                <input
                  name="published"
                  type="checkbox"
                  defaultChecked={editing?.published ?? true}
                />
                Published
              </label>
            </div>
            {productError && (
              <p role="alert" className="text-sm text-red-700">
                {productError}
              </p>
            )}
            <Button className="w-full" disabled={busy}>
              <Upload size={20} />
              {busy ? "Saving…" : "Save product & files"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function Pagination({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-4">
      <Button
        size="sm"
        variant="outline"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </Button>
      <span className="text-xs">
        Page {page} of {pages}
      </span>
      <Button
        size="sm"
        variant="outline"
        disabled={page >= pages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
