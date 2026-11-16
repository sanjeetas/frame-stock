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
import { Clients } from "./components/CompanySections";
import { Footer } from "./components/Footer";
import { useScrollReveal } from "./hooks/useScrollReveal";
const categories = [
  ["Digital printing", "product-p78.webp", "Printing Products"],
  ["Signage & boards", "product-p6.webp", "Printing Products"],
  ["Customised products", "product-p45.webp", "Customised Products"],
  ["Gifting items", "product-p42.webp", "Gifting Items"],
  ["Image library", "library-samples.svg", "Image Library"],
  ["Rollups & standees", "product-p24.webp", "Printing Products"],
];
export function App() {
  useScrollReveal();
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
        <div className="mx-auto flex max-w-7xl justify-between gap-5 px-5 py-2 text-sm">
          <span>All types of printing solutions · Mumbai, India</span>
          <a
            href="tel:+918451010020"
            className="flex shrink-0 items-center gap-2"
          >
            <Phone size={18} />
            +91 84510 10020
          </a>
        </div>
      </div>
      <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <a href="#home">
          <img
            src={asset("assets/logo.png")}
            alt="PHULO Multi Graphics"
            className="h-24 w-44 object-contain"
          />
        </a>
        <p className="hidden text-lg font-medium text-slate-600 lg:block">
          Print. Personalise. Inspire.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {auth.user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href="#account">
                  <UserRound size={20} />
                  <span className="hidden sm:inline">{auth.user.name}</span>
                </a>
              </Button>
              {auth.user.role === "admin" && (
                <Button variant="ghost" size="sm" asChild>
                  <a href="#admin">
                    <ShieldCheck size={20} />
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
                <LogOut size={20} />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthOpen(true)}
              disabled={auth.loading}
            >
              <UserRound size={20} />
              {auth.loading ? "Checking…" : "Sign in"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setCartOpen(true)}>
            <ShoppingBag size={20} />
            <span className="hidden sm:inline">My order</span>
            <span className="rounded bg-slate-100 px-1.5 text-sm text-primary">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </Button>
        </div>
      </header>
      <nav
        aria-label="Main navigation"
        className="colour-nav sticky top-0 z-30 shadow-md"
      >
        <div className="nav-row mx-auto flex max-w-7xl flex-nowrap items-center gap-2 overflow-x-auto px-5 py-2 text-sm whitespace-nowrap">
          <Button
            className="nav-categories my-0 h-12 rounded-xl"
            onClick={() => browse("All products")}
          >
            <Menu size={20} />
            All categories
          </Button>
          <a href="#home" aria-current={isHome ? "page" : undefined}>
            Home
          </a>
          {[
            "Printing Products",
            "Gifting Items",
            "Customised Products",
            "Image Library",
          ].map((g) => (
            <button
              key={g}
              className={
                "nav-item " +
                (route === "catalog" && group === g
                  ? "font-bold text-primary"
                  : "")
              }
              aria-current={
                route === "catalog" && group === g ? "page" : undefined
              }
              onClick={() => browse(g)}
            >
              {g}
            </button>
          ))}
          <a
            href="#contact"
            aria-current={route === "contact" ? "page" : undefined}
          >
            Contact us
          </a>
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
            <section className="mx-auto mt-6 grid max-w-7xl gap-5 px-5 lg:grid-cols-[235px_1fr]">
              <aside className="hidden rounded-lg border border-slate-200 bg-white lg:block">
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
                    className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50"
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
              <div className="print-hero relative grid min-h-110 items-center gap-8 overflow-hidden rounded-3xl p-7 md:grid-cols-[1.1fr_1fr] md:p-10">
                <div className="relative z-10 max-w-md">
                  <p className="text-sm font-bold tracking-[.2em] text-cyan-700">
                    BIG IDEAS. BRILLIANT PRINTS.
                  </p>
                  <h1 className="mt-5 text-4xl leading-[1.12] font-bold tracking-tight lg:text-5xl">
                    Your ideas.
                    <br />
                    Beautifully <span className="text-accent">printed.</span>
                  </h1>
                  <p className="my-5 max-w-md text-lg leading-8 text-slate-600">
                    From a bold first impression to a gift they’ll keep.
                    Printing, branding and design, all in one place.
                  </p>
                  <Button onClick={() => browse("Printing Products")}>
                    Explore printing products
                    <ArrowUpRight size={20} />
                  </Button>
                </div>
                <div
                  className="hero-products grid grid-cols-2 gap-3"
                  aria-label="Printing and personalised products"
                >
                  {[
                    ["product-p42.webp", "Personalised mugs"],
                    ["product-p45.webp", "Custom T-shirts"],
                    ["product-p78.webp", "Colourful digital prints"],
                    ["product-p44.webp", "Printed canvas bags"],
                  ].map(([image, label], index) => (
                    <button
                      key={label}
                      className={
                        "rounded-2xl bg-white p-3 text-left shadow-lg transition-transform hover:-translate-y-1 " +
                        (index % 2 ? "translate-y-4" : "")
                      }
                      onClick={() =>
                        browse(
                          index === 0
                            ? "Gifting Items"
                            : index === 1 || index === 3
                              ? "Customised Products"
                              : "Printing Products",
                        )
                      }
                    >
                      <img
                        src={asset("assets/" + image)}
                        alt={label}
                        className="aspect-square w-full rounded-xl object-cover"
                      />
                      <span className="mt-2 block text-sm font-semibold">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
            <section className="mx-auto max-w-7xl px-5 pt-12">
              <p className="text-sm font-bold tracking-[.2em] text-cyan-700">
                FIND WHAT YOU NEED
              </p>
              <h2 className="mt-2 mb-6 text-3xl font-bold">
                Explore our categories
              </h2>
              <div className="grid grid-cols-3 gap-5 md:grid-cols-6">
                {categories.map(([label, image, g]) => (
                  <button
                    key={label}
                    className="category-tile rounded-2xl p-3 text-center transition-transform hover:-translate-y-1"
                    onClick={() => browse(g!)}
                  >
                    <img
                      src={asset("assets/" + image)}
                      alt={label}
                      className="mb-3 aspect-square w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                    <span className="text-base font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
        {(isHome || route === "catalog") && (
          <Catalog group={group} onOpen={(p) => setSelected(p)} />
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
                <ArrowUpRight size={20} />
              </a>
            </Button>
          </section>
        )}
        {isHome && <Clients />}
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [CheckCircle2, "Best Quality Guarantee"],
            [Clock3, "Fast Production"],
            [IndianRupee, "Lowest Pricing"],
            [Truck, "Shipping in India"],
          ].map(([Icon, title]) => {
            const Component = Icon as typeof CheckCircle2;
            return (
              <div
                key={String(title)}
                className="benefit-card flex items-center gap-4 rounded-2xl bg-primary p-6 text-white"
              >
                <Component size={44} className="shrink-0" />
                <span className="text-lg font-semibold">{String(title)}</span>
              </div>
            );
          })}
        </section>
      </main>
      <Footer onBrowse={browse} />
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
