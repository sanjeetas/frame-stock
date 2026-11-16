import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ShoppingBag,
  UserRound,
  LogOut,
  ShieldCheck,
  Menu,
  Phone,
  CheckCircle2,
  Clock3,
  Truck,
  IndianRupee,
} from "lucide-react";
import { useAuth } from "./features/auth/AuthProvider";
import { AuthDialog } from "./features/auth/AuthDialog";
import { Catalog } from "./features/catalog/Catalog";
import { ProductDialog } from "./features/catalog/ProductDialog";
import { CartDialog } from "./features/orders/CartDialog";
import { Account } from "./features/orders/Account";
import { Admin } from "./features/admin/Admin";
import { Button } from "./components/ui/button";
import { ErrorState } from "./components/Feedback";
import type { CartItem, Product } from "./types";
import { asset } from "./lib/utils";
const categories = [
  ["Digital printing", "digital.png", "Printing Products"],
  ["Signage & boards", "acrylic.webp", "Printing Products"],
  ["Customised products", "exhibition.jpg", "Customised Products"],
  ["Gifting items", "display.jpg", "Gifting Items"],
  ["Image library", "venue.jpg", "Image Library"],
  ["Rollups & standees", "standee.jpg", "Printing Products"],
];
export function App() {
  const auth = useAuth(),
    [route, setRoute] = useState(location.hash.slice(1) || "home"),
    [group, setGroup] = useState("All products"),
    [authOpen, setAuthOpen] = useState(false),
    [cartOpen, setCartOpen] = useState(false),
    [cart, setCart] = useState<CartItem[]>([]),
    [selected, setSelected] = useState<Product | null>(null),
    [notice, setNotice] = useState(""),
    [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    const change = () => {
      setRoute(location.hash.slice(1) || "home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  function browse(g: string) {
    setGroup(g);
    location.hash = "catalog";
    if (route === "catalog")
      document
        .getElementById("catalog")
        ?.scrollIntoView({ behavior: "smooth" });
  }
  async function logout() {
    setLogoutError("");
    try {
      await auth.logout();
      setCart([]);
      setSelected(null);
      location.hash = "home";
    } catch (e) {
      setLogoutError((e as Error).message);
    }
  }
  const isHome = route === "home" || route === "";
  return (
    <>
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4"
      >
        Skip to main content
      </a>
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-7xl justify-between gap-5 px-5 py-2 text-[10px]">
          <span>All types of printing solutions · Mumbai, India</span>
          <a
            href="tel:+918451010020"
            className="flex shrink-0 items-center gap-2"
          >
            <Phone size={11} />
            +91 84510 10020
          </a>
        </div>
      </div>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <a href="#home">
          <img
            src={asset("assets/logo.png")}
            alt="PHULO Multi Graphics"
            className="h-20 w-36 object-contain"
          />
        </a>
        <p className="hidden text-sm text-slate-500 lg:block">
          Print. Personalise. Inspire.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {auth.user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href="#account">
                  <UserRound size={16} />
                  <span className="hidden sm:inline">{auth.user.name}</span>
                </a>
              </Button>
              {auth.user.role === "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <a href="#admin">
                    <ShieldCheck size={16} />
                    Admin
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthOpen(true)}
              disabled={auth.loading}
            >
              <UserRound size={16} />
              {auth.loading ? "Checking…" : "Sign in"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">My order</span>
            <span className="rounded bg-slate-100 px-1.5 text-xs text-primary">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </Button>
        </div>
      </header>
      <nav className="border-y border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-5 text-xs whitespace-nowrap">
          <Button
            className="my-0 h-12 rounded-none"
            onClick={() => browse("All products")}
          >
            <Menu size={16} />
            All categories
          </Button>
          <a href="#home">Home</a>
          {[
            "Printing Products",
            "Gifting Items",
            "Customised Products",
            "Image Library",
          ].map((g) => (
            <button
              key={g}
              className={
                "py-4 " +
                (route === "catalog" && group === g
                  ? "font-bold text-primary"
                  : "")
              }
              onClick={() => browse(g)}
            >
              {g}
            </button>
          ))}
          <a href="#contact">Contact us</a>
        </div>
      </nav>
      <main id="main-content" tabIndex={-1}>
        {logoutError && (
          <div className="mx-auto max-w-7xl px-5">
            <ErrorState message={logoutError} />
          </div>
        )}
        {auth.error && (
          <div className="mx-auto max-w-7xl px-5">
            <ErrorState message={auth.error} retry={() => void auth.reload()} />
          </div>
        )}
        {isHome && (
          <>
            <section className="mx-auto mt-6 grid max-w-7xl gap-5 px-5 md:grid-cols-[210px_1fr]">
              <aside className="hidden rounded-lg border border-slate-200 md:block">
                {[
                  "Signage & Boards",
                  "Digital & Graphic Prints",
                  "Flex & Vinyl Printing",
                  "Mirror Acrylic",
                  "Router Cutting",
                  "Standees & Displays",
                  "Marketing & Office Prints",
                  "Customised Products",
                  "Gifting Items",
                  "Image Library",
                ].map((c) => (
                  <button
                    key={c}
                    className="block w-full border-b border-slate-100 px-4 py-3 text-left text-[11px] hover:bg-slate-50"
                    onClick={() =>
                      browse(
                        c === "Gifting Items" ||
                          c === "Customised Products" ||
                          c === "Image Library"
                          ? c
                          : "Printing Products",
                      )
                    }
                  >
                    {c}
                    <span className="float-right">›</span>
                  </button>
                ))}
              </aside>
              <div className="relative flex min-h-100 items-center overflow-hidden rounded-lg bg-[#edf3f8] p-7 md:p-10">
                <div className="relative z-10 max-w-md">
                  <p className="text-[10px] font-bold tracking-[.2em] text-cyan-700">
                    PHULO MULTI GRAPHICS
                  </p>
                  <h1 className="mt-5 text-4xl leading-[1.12] font-bold tracking-tight lg:text-5xl">
                    Your ideas.
                    <br />
                    Beautifully <span className="text-primary">printed.</span>
                  </h1>
                  <p className="my-5 max-w-xs text-sm leading-6 text-slate-500">
                    From a bold first impression to a gift they’ll keep.
                    Printing, branding and design, all in one place.
                  </p>
                  <Button onClick={() => browse("Printing Products")}>
                    Explore printing products
                    <ArrowUpRight size={16} />
                  </Button>
                </div>
                <img
                  src={asset("assets/digital.png")}
                  alt="Printed products and brand materials"
                  className="absolute right-[-5%] w-[48%] -rotate-6 mix-blend-multiply opacity-30 lg:opacity-90"
                />
              </div>
            </section>
            <section className="mx-auto max-w-7xl px-5 pt-12">
              <p className="text-[10px] font-bold tracking-[.2em] text-cyan-700">
                FIND WHAT YOU NEED
              </p>
              <h2 className="mt-2 mb-6 text-2xl font-bold">
                Explore our categories
              </h2>
              <div className="grid grid-cols-3 gap-5 md:grid-cols-6">
                {categories.map(([label, image, g]) => (
                  <button
                    key={label}
                    className="text-center"
                    onClick={() => browse(g!)}
                  >
                    <img
                      src={asset("assets/" + image)}
                      alt={label}
                      className="mb-3 aspect-square w-full rounded-full object-cover"
                      loading="lazy"
                    />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
        {(isHome || route === "catalog") && (
          <Catalog
            group={group}
            onGroup={setGroup}
            onOpen={(p) => setSelected(p)}
          />
        )}{" "}
        {route === "account" && <Account onSignIn={() => setAuthOpen(true)} />}{" "}
        {route === "admin" && <Admin />}
        {route === "contact" && (
          <section className="mx-auto max-w-7xl px-5 py-12">
            <h1 className="mb-4 text-3xl font-bold">
              Let’s bring your idea to life.
            </h1>
            <p className="max-w-xl text-sm leading-7 text-slate-500">
              Tell us your size, material, quantity and design requirements.
              We’ll confirm the quote, production and delivery before payment.
            </p>
            <Button asChild className="mt-6">
              <a
                href="https://wa.me/918451010020"
                target="_blank"
                rel="noopener noreferrer"
              >
                Talk to PHULO on WhatsApp
                <ArrowUpRight size={16} />
              </a>
            </Button>
          </section>
        )}
        <section className="mx-auto grid max-w-7xl grid-cols-2 gap-6 border-t border-slate-200 px-5 py-9 md:grid-cols-4">
          {[
            [CheckCircle2, "Quality you can see"],
            [Clock3, "Fast production"],
            [IndianRupee, "Clear pricing"],
            [Truck, "Shipping in India"],
          ].map(([Icon, title]) => {
            const Component = Icon as typeof CheckCircle2;
            return (
              <div
                key={String(title)}
                className="flex items-center gap-3 text-primary"
              >
                <Component size={22} />
                <span className="text-xs font-semibold">{String(title)}</span>
              </div>
            );
          })}
        </section>
      </main>
      <footer className="bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-xs leading-7 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <h2 className="mb-3 text-lg font-bold">Phulo Multi Graphics</h2>
            <p className="text-slate-500">All Types Of Printing Solutions</p>
            <a className="block" href="tel:+918451010020">
              +91 8451010020
            </a>
            <a href="mailto:phulomultigraphics@gmail.com">
              phulomultigraphics@gmail.com
            </a>
            <p className="mt-3 text-slate-500">
              Santosh Nagar, AK Vidya Marg, Near Royal Academy School,
              <br />
              Film City Road, Goregaon (E), Mumbai – 400065
            </p>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Quick links</h3>
            <a href="#home" className="block">
              Home
            </a>
            <a href="#account" className="block">
              My account & orders
            </a>
            <button onClick={() => browse("Image Library")} className="block">
              Image library
            </button>
            <a href="#contact" className="block">
              Contact us
            </a>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">How it works</h3>
            <p>Printing → Confirmed WhatsApp quote</p>
            <p>Gifting → Order request</p>
            <p>Customised → Design confirmation</p>
            <p>Images → Preview free / HD paid</p>
            <p className="mt-3 text-slate-500">
              Image reuse or resale is not allowed.
            </p>
          </div>
          <p className="border-t border-slate-200 pt-5 text-[10px] text-slate-500 md:col-span-3">
            © {new Date().getFullYear()} Phulo Multi Graphics. All rights
            reserved.
          </p>
        </div>
      </footer>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <ProductDialog
        key={selected?.id || "none"}
        product={selected}
        onClose={() => setSelected(null)}
        onAdd={(item) => {
          setCart((v) => [...v, item]);
          setNotice("Added to your order.");
        }}
        onSignIn={() => setAuthOpen(true)}
      />
      <CartDialog
        items={cart}
        onRemove={(key) => setCart((v) => v.filter((i) => i.key !== key))}
        onClear={() => setCart([])}
        open={cartOpen}
        onOpenChange={setCartOpen}
        onSignIn={() => setAuthOpen(true)}
      />
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-primary px-5 py-3 text-sm text-white shadow-xl"
        >
          {notice}
        </div>
      )}
    </>
  );
}
