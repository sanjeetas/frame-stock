import { Mail, MapPin, MessageCircle, Phone, ArrowUpRight } from "lucide-react";
import { company } from "../lib/company";
import { asset } from "../lib/utils";

export function Footer({ onBrowse }: { onBrowse: (group: string) => void }) {
  return (
    <footer
      className="site-footer bg-[#edf4fa]"
      aria-label="Company information"
    >
      <div className="mx-auto max-w-7xl px-5 pt-12">
        <div className="mb-9 flex flex-wrap items-center justify-between gap-5 border-b border-slate-200 pb-8">
          <a href="#home" aria-label="PHULO home">
            <img
              src={asset("assets/logo.png")}
              alt="PHULO Multi Graphics"
              className="h-24 w-44 object-contain"
            />
          </a>
          <div>
            <p className="text-2xl font-bold text-primary">
              Let’s make something brilliant.
            </p>
            <p className="mt-2 text-slate-600">
              All types of printing solutions, made for your ideas.
            </p>
          </div>
          <a
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-colors hover:bg-accent"
            href={company.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            Discuss your project <ArrowUpRight size={22} />
          </a>
        </div>
        <div className="grid gap-9 pb-10 sm:grid-cols-2 lg:grid-cols-[1.25fr_1.2fr_.8fr_1fr]">
          <section aria-labelledby="footer-address">
            <h2 id="footer-address" className="footer-heading">
              <MapPin size={24} className="text-cyan-700" />
              Our address
            </h2>
            <address className="not-italic leading-7 text-slate-600">
              {company.address}
            </address>
            <a
              className="mt-4 inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get directions <ArrowUpRight size={18} />
            </a>
          </section>
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact" className="footer-heading">
              <MessageCircle size={24} className="text-emerald-700" />
              Contact us
            </h2>
            <div className="space-y-4">
              <a className="footer-contact-link" href="tel:+918451010020">
                <Phone size={20} />
                <span>{company.phone}</span>
              </a>
              <a className="footer-contact-link" href="tel:+917400006069">
                <Phone size={20} />
                <span>{company.secondPhone}</span>
              </a>
              <a
                className="footer-contact-link"
                href={`mailto:${company.email}`}
              >
                <Mail size={20} />
                <span className="min-w-0 break-all">{company.email}</span>
              </a>
              <a
                className="inline-flex items-center gap-2 font-semibold text-emerald-800 underline underline-offset-4"
                href={company.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat on WhatsApp <ArrowUpRight size={18} />
              </a>
            </div>
          </section>
          <section aria-labelledby="footer-links">
            <h2 id="footer-links" className="footer-heading">
              Quick links
            </h2>
            <nav
              aria-label="Footer navigation"
              className="flex flex-col items-start gap-3 text-slate-600"
            >
              <a href="#home">Home</a>
              <a href="#account">My account & orders</a>
              <a href="#downloads">My image downloads</a>
              <button onClick={() => onBrowse("Image Library")}>
                Image library
              </button>
              <a href="#contact">Contact us</a>
            </nav>
          </section>
          <section aria-labelledby="footer-process">
            <h2 id="footer-process" className="footer-heading">
              How it works
            </h2>
            <ol className="space-y-3 leading-7 text-slate-600">
              <li>Choose your product or design.</li>
              <li>Share size, quantity & customisation.</li>
              <li>Confirm your quote and artwork.</li>
              <li>We print and arrange delivery.</li>
            </ol>
          </section>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 py-6 text-sm text-slate-600">
          <p>
            © {new Date().getFullYear()} PHULO Multi Graphics. All rights
            reserved.
          </p>
          <p>Standalone image resale or redistribution is not allowed.</p>
        </div>
      </div>
    </footer>
  );
}
