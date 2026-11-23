import { SignageBanner } from "./BannerLogo";
import { OrbitBanner } from "./OrbitBanner";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { asset } from "../lib/utils";

export interface PrintSlide {
  id: string;
  title: string;
  content: ReactNode;
  kind?: "original" | "category";
  duration?: number;
}

export const originalSlides = [
  {
    image: "phulo-printing.webp",
    title: "Print with PHULO",
    alt: "PHULO Multi Graphics printing machines and printing services. Contact 7400006069 or 8451010020, phulomultigraphics@gmail.com.",
  },
  {
    image: "phulo-signage.webp",
    title: "Make your brand stand out",
    alt: "PHULO graphic designing, vinyl and canvas, flex banners, laser cutting, acrylic and MDF, branding, signage and fabrication.",
  },
].map((slide): PrintSlide => ({
  id: slide.image,
  title: slide.title,
  kind: "original",
  duration: slide.image === "phulo-printing.webp" ? 18000 : 6500,
  content: slide.image === "phulo-printing.webp" ? <OrbitBanner /> : <SignageBanner source={asset(`assets/slides/${slide.image}`)} alt={slide.alt} />,
}));

export function PrintSlider({ slides = originalSlides, label = "PHULO printing highlights" }: {
  slides?: PrintSlide[];
  label?: string;
} = {}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);
  const current = slides[active % slides.length]!;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReducedMotion(media.matches);
      if (media.matches) { setPaused(true); setMotionPaused(true); }
    };
    const visibility = () => setHidden(document.hidden);
    motion();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    if (paused || hovered || hidden || slides.length < 2) return;
    const timer = window.setTimeout(() => setActive((value) => (value + 1) % slides.length), current.duration || 5500);
    return () => window.clearTimeout(timer);
  }, [paused, hovered, hidden, slides.length, active, current.duration]);

  function select(index: number) {
    setPaused(true);
    setActive((index + slides.length) % slides.length);
  }

  return (
    <section
      className="phulo-slider mb-6"
      aria-label={label}
      aria-roledescription="carousel"
      data-motion={!motionPaused && !hidden && !reducedMotion}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setPaused(true)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(active + (event.key === "ArrowRight" ? 1 : -1));
        }
      }}
    >
      <div
        className="phulo-slider-window"
        data-category={current.kind === "category"}
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          const end = event.changedTouches[0]?.clientX;
          if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 45)
            select(active + (end < touchStart.current ? 1 : -1));
          touchStart.current = null;
        }}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="phulo-slider-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-hidden={active % slides.length !== index}
            inert={active % slides.length !== index}
            data-active={active % slides.length === index}
            data-kind={slide.kind || "original"}
          >
            {slide.content}
          </div>
        ))}
      </div>
      {slides.length > 1 && <div className="phulo-slider-controls">
        <p aria-live={paused ? "polite" : "off"} className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
          {slides[active % slides.length]!.title}
        </p>
        <button type="button" className="phulo-slider-arrow" aria-label="Previous banner" onClick={() => select(active - 1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-1" aria-label="Choose banner">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className="phulo-slider-dot"
              aria-label={`Show banner ${index + 1}: ${slide.title}`}
              aria-current={active % slides.length === index ? "true" : undefined}
              onClick={() => select(index)}
            ><span /></button>
          ))}
        </div>
        <button type="button" className="phulo-slider-arrow" aria-label="Next banner" onClick={() => select(active + 1)}>
          <ChevronRight size={20} />
        </button>
        <button
          type="button"
          className="phulo-slider-arrow"
          aria-label={motionPaused ? "Play banners" : "Pause banners"}
          onClick={() => { setMotionPaused(!motionPaused); setPaused(!motionPaused); }}
          disabled={reducedMotion}
          title={reducedMotion ? "Automatic slides are off for reduced motion" : undefined}
        >{motionPaused ? <Play size={17} /> : <Pause size={17} />}</button>
      </div>}
    </section>
  );
}
