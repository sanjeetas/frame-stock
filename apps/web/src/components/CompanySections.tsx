import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { asset } from "../lib/utils";
import { Button } from "./ui/button";

const clients = [
  "Balaji",
  "ALT Balaji",
  "Creative Eye Limited",
  "Jay Production",
  "The Vermillion World",
  "LoneRanger Productions",
  "Film House Media",
  "DJ’s a creative unit",
];

export function Clients() {
  const row = useRef<HTMLDivElement>(null);
  return (
    <section
      className="mx-auto max-w-7xl px-5 py-10"
      aria-labelledby="clients-title"
    >
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-bold tracking-widest text-accent">
            PRINTING PARTNERS
          </p>
          <h2 id="clients-title" className="text-3xl font-bold">
            Our clients
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous clients"
            onClick={() =>
              row.current?.scrollBy({ left: -400, behavior: "smooth" })
            }
          >
            <ArrowLeft size={22} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next clients"
            onClick={() =>
              row.current?.scrollBy({ left: 400, behavior: "smooth" })
            }
          >
            <ArrowRight size={22} />
          </Button>
        </div>
      </div>
      <div
        ref={row}
        className="flex snap-x gap-4 overflow-x-auto pb-4"
        tabIndex={0}
        aria-label="Client logos, scroll for more"
      >
        {clients.map((name, index) => (
          <div
            key={name}
            className="flex h-36 w-48 shrink-0 snap-start items-center justify-center rounded-2xl border border-slate-200 bg-white p-4"
          >
            <img
              src={asset(`assets/clients/${index + 1}.png`)}
              alt={name}
              loading="lazy"
              className="max-h-full w-full object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
