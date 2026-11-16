import { useState } from "react";
import { Download, Trash2, PenLine } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useApiQuery } from "../../hooks/useApiQuery";
import { api, ApiError } from "../../lib/api";
import { apiBase, money } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Loading, ErrorState, Empty } from "../../components/Feedback";
import { DesignEditor } from "../editor/DesignEditor";
import type { Order, Design } from "../../types";
export function Account({ onSignIn }: { onSignIn: () => void }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1),
    [designPage, setDesignPage] = useState(1);
  const orders = useApiQuery<Order[]>(
      user ? "/orders?page=" + page + "&limit=10" : null,
    ),
    designs = useApiQuery<Design[]>(
      user ? "/designs?page=" + designPage + "&limit=10" : null,
    );
  const [editing, setEditing] = useState<Design | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function mutate(key: string, path: string, method: string) {
    setBusy(key);
    setError("");
    try {
      await api(path, { method, body: {} });
      orders.reload();
      designs.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function download(o: Order, index: number) {
    setBusy(o.id + "-" + index);
    setError("");
    try {
      await api("/auth/me");
      const res = await fetch(apiBase + `/orders/${o.id}/download/${index}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new ApiError(
          body.error?.message || "Download unavailable.",
          res.status,
          body.error?.code,
        );
      }
      const blob = await res.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("content-disposition") || "";
      a.download =
        disposition.match(/filename="?([^";]+)/)?.[1] || "phulo-download";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (!user)
    return (
      <div className="mx-auto max-w-7xl px-5 py-16">
        <Empty
          title="Your account"
          description="Sign in to see your orders and saved designs."
        />
        <Button className="mt-5" onClick={onSignIn}>
          Sign in
        </Button>
      </div>
    );
  return (
    <section className="mx-auto max-w-7xl space-y-9 px-5 py-10">
      <div>
        <p className="text-xs tracking-widest text-cyan-700">
          YOUR CREATIVE SPACE
        </p>
        <h1 className="mt-2 text-3xl font-bold">Hello, {user.name}.</h1>
        <p className="mt-2 text-sm text-slate-500">
          Your orders, purchased files and saved design proofs.
        </p>
      </div>
      {error && <ErrorState message={error} />}
      <div>
        <h2 className="mb-5 text-xl font-bold">My orders</h2>
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
                    Order {o.id.slice(-8).toUpperCase()}
                  </h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                    {o.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {new Date(o.createdAt).toLocaleDateString()} ·{" "}
                  {money(o.total)}
                  {o.needsQuote ? " + quote items" : ""}
                </p>
                <div className="my-4 space-y-2">
                  {o.items.map((i, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center justify-between gap-3 text-sm"
                    >
                      <span>
                        {i.title} × {i.quantity}
                      </span>
                      {i.kind === "image" && o.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!!busy}
                          onClick={() => download(o, index)}
                        >
                          <Download size={18} />
                          {busy === o.id + "-" + index
                            ? "Downloading…"
                            : "Download HD"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {o.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() =>
                      mutate(o.id, "/orders/" + o.id + "/cancel", "PATCH")
                    }
                  >
                    {busy === o.id ? "Cancelling…" : "Cancel request"}
                  </Button>
                )}
              </Card>
            ))}
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs">Page {page}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= (orders.data.meta?.pages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : (
          <Empty
            title="No orders yet"
            description="Browse the catalog and send your first order request."
          />
        )}
      </div>
      <div>
        <h2 className="mb-5 text-xl font-bold">My designs</h2>
        {designs.loading ? (
          <Loading />
        ) : designs.error ? (
          <ErrorState message={designs.error} retry={designs.reload} />
        ) : designs.data?.data.length ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {designs.data.data.map((d) => (
                <Card key={d.id}>
                  <div
                    className="mb-4 rounded-lg p-7 text-center"
                    style={{
                      background: d.settings.bg,
                      color: d.settings.fg,
                      fontFamily: d.settings.font,
                    }}
                  >
                    <p className="font-semibold">{d.title}</p>
                    <p className="mt-2 text-xs tracking-widest opacity-60">
                      PHULO DESIGN PROOF
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(d)}
                    >
                      <PenLine size={18} />
                      Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={!!busy}
                      aria-label={"Delete " + d.title}
                      onClick={() => mutate(d.id, "/designs/" + d.id, "DELETE")}
                    >
                      <Trash2 size={20} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Button
                size="sm"
                variant="outline"
                disabled={designPage <= 1}
                onClick={() => setDesignPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs">Page {designPage}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={designPage >= (designs.data.meta?.pages || 1)}
                onClick={() => setDesignPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <Empty
            title="No saved designs"
            description="Customise an editable product and save its design to your account."
          />
        )}
      </div>
      <DesignEditor
        open={!!editing}
        onOpenChange={(v) => {
          if (!v) setEditing(null);
        }}
        existingId={editing?.id}
        initial={editing?.settings}
        onSaved={designs.reload}
        onSignIn={onSignIn}
      />
    </section>
  );
}
