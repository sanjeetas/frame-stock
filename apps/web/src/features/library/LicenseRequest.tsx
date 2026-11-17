import { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Field } from "../../components/Field";
import type { Product, Order } from "../../types";
export function LicenseRequest({
  product,
  onSignIn,
  onPreview,
  downloading,
  onEdit,
}: {
  product: Product;
  onSignIn: () => void;
  onPreview: () => void;
  downloading: boolean;
  onEdit: () => void;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [order, setOrder] = useState<Order | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await api<Order>(`/library/${product.id}/license`, {
        method: "POST",
        body: { name: form.get("name"), phone: form.get("phone") },
      });
      setOrder(response.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        className="w-full"
        disabled={downloading}
        onClick={onPreview}
      >
        {downloading ? "Preparing…" : "Download free watermarked preview"}
      </Button>
      <Button variant="outline" className="w-full" onClick={onEdit}>
        Edit this image / add your text
      </Button>
      <ol className="rounded-xl bg-cyan-50 p-4 text-sm leading-7">
        <li>1. Preview and choose your image.</li>
        <li>2. Request the HD license at the shown price.</li>
        <li>3. Confirm payment with PHULO.</li>
        <li>4. Download your original from My image downloads.</li>
      </ol>
      {order ? (
        <div
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-900"
        >
          License request {order.id.slice(-8).toUpperCase()} created. Payment is
          pending verification.{" "}
          <a href="#downloads" className="block font-bold underline">
            Open My image downloads
          </a>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Your name">
            {(id) => (
              <Input
                id={id}
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={user?.name}
              />
            )}
          </Field>
          <Field label="Contact number">
            {(id) => (
              <Input
                id={id}
                name="phone"
                type="tel"
                required
                minLength={8}
                maxLength={20}
              />
            )}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy || !product.hasFile}>
            {busy
              ? "Requesting…"
              : !product.hasFile
                ? "HD original not available"
                : user
                  ? "Request HD image license"
                  : "Sign in to request HD license"}
          </Button>
        </form>
      )}
    </div>
  );
}
