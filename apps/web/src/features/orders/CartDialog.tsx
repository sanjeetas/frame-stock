import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input, Textarea } from "../../components/ui/input";
import { Field } from "../../components/Field";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../../lib/api";
import { money } from "../../lib/utils";
import type { CartItem, Order } from "../../types";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^\+?[\d ()-]{8,20}$/, "Enter a valid phone number."),
  address: z.string().max(1000),
  notes: z.string().max(2000),
});
interface Props {
  items: CartItem[];
  onRemove: (key: string) => void;
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignIn: () => void;
}
export function CartDialog({
  items,
  onRemove,
  onClear,
  open,
  onOpenChange,
  onSignIn,
}: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({});
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    setError("");
    setFields({});
    const values = schema.safeParse(
      Object.fromEntries(new FormData(e.currentTarget)),
    );
    if (!values.success) {
      setFields(
        Object.fromEntries(
          values.error.issues.map((i) => [i.path[0], i.message]),
        ),
      );
      return;
    }
    setBusy(true);
    try {
      const r = await api<Order>("/orders", {
        method: "POST",
        body: {
          ...values.data,
          items: items.map(({ productId, quantity, customization }) => ({
            productId,
            quantity,
            customization,
          })),
        },
      });
      setSuccess(
        "Order request " +
          r.data.id +
          " received. PHULO will confirm your quote and payment details.",
      );
      onClear();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          onOpenChange(v);
          if (!v) {
            setError("");
            setSuccess("");
          }
        }
      }}
    >
      <DialogContent>
        <DialogTitle className="text-2xl font-bold">
          Your order request
        </DialogTitle>
        <DialogDescription className="my-3 text-sm text-slate-500">
          No payment is taken here. Availability, shipping and final pricing are
          confirmed by PHULO.
        </DialogDescription>
        {items.map((i) => (
          <div
            key={i.key}
            className="flex items-center justify-between gap-4 border-b border-slate-100 py-4"
          >
            <div>
              <h3 className="text-sm font-semibold">{i.title}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {i.quantity} {i.unit} · {money(i.price)}
                {i.customization.design ? " · Custom design" : ""}
              </p>
              {i.customization.options && (
                <p className="mt-1 text-xs text-primary">
                  {Object.entries(i.customization.options)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")}
                </p>
              )}
              <p className="text-xs text-slate-500">
                {i.customization.requirements}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={"Remove " + i.title}
              onClick={() => onRemove(i.key)}
            >
              <Trash2 size={20} />
            </Button>
          </div>
        ))}
        {success && (
          <p
            role="status"
            className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {success}
          </p>
        )}
        {!items.length && !success && (
          <p className="py-8 text-sm text-slate-500">Your order is empty.</p>
        )}
        {items.length > 0 && (
          <>
            <p className="my-5 text-sm font-semibold">
              Estimated subtotal:{" "}
              {money(
                items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0),
              )}
              {items.some((i) => i.price === null) ? " + quote items" : ""}
            </p>
            {!user ? (
              <Button onClick={onSignIn}>Sign in to submit your order</Button>
            ) : (
              <form className="space-y-4" onSubmit={submit} noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name" error={fields.name}>
                    {(id, d) => (
                      <Input
                        id={id}
                        name="name"
                        defaultValue={user.name}
                        aria-describedby={d}
                      />
                    )}
                  </Field>
                  <Field label="Phone / WhatsApp" error={fields.phone}>
                    {(id, d) => (
                      <Input
                        id={id}
                        name="phone"
                        type="tel"
                        aria-describedby={d}
                      />
                    )}
                  </Field>
                </div>
                <Field label="Delivery address" error={fields.address}>
                  {(id) => <Textarea id={id} name="address" maxLength={1000} />}
                </Field>
                <Field label="Order notes" error={fields.notes}>
                  {(id) => <Textarea id={id} name="notes" maxLength={2000} />}
                </Field>
                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}
                <Button disabled={busy} className="w-full">
                  {busy ? "Submitting…" : "Submit order request"}
                </Button>
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
