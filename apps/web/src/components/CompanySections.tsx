import { useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { company } from "../lib/company";
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

export function ContactDetails() {
  return (
    <section
      className="border-t border-slate-200 bg-white"
      aria-label="Contact details"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-2 xl:grid-cols-3">
        <div className="flex gap-5">
          <div className="contact-icon bg-[#0b6b4b]">
            <MessageCircle size={34} />
          </div>
          <div className="min-w-0">
            <h2 className="mb-3 text-xl font-bold">WhatsApp & call</h2>
            <a
              className="block leading-8"
              href={company.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              {company.phone}
            </a>
            <a className="block leading-8" href="tel:+917400006069">
              {company.secondPhone}
            </a>
          </div>
        </div>
        <div className="flex gap-5">
          <div className="contact-icon bg-primary">
            <MapPin size={34} />
          </div>
          <div>
            <h2 className="mb-3 text-xl font-bold">Visit us</h2>
            <p className="leading-7 text-slate-600">{company.address}</p>
            <a
              className="mt-3 inline-block font-semibold text-primary underline underline-offset-4"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions ↗
            </a>
          </div>
        </div>
        <div className="flex gap-5">
          <div className="contact-icon bg-[#ab1764]">
            <Mail size={34} />
          </div>
          <div className="min-w-0">
            <h2 className="mb-3 text-xl font-bold">Email us</h2>
            <a
              className="break-all leading-7 text-slate-600 hover:underline"
              href={`mailto:${company.email}`}
            >
              {company.email}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
