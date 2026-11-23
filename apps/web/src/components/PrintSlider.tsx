import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { asset } from "../lib/utils";

const slides = [
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
];

export function PrintSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPaused(true);
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
    if (paused || hovered || hidden) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [paused, hovered, hidden]);

  function select(index: number) {
    setPaused(true);
    setActive((index + slides.length) % slides.length);
  }

  return (
    <section
      className="phulo-slider mb-6"
      aria-label="PHULO printing highlights"
      aria-roledescription="carousel"
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
            key={slide.image}
            className="phulo-slider-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-hidden={active !== index}
            data-active={active === index}
          >
            <img
              src={asset(`assets/slides/${slide.image}`)}
              alt={slide.alt}
              width={1600}
              height={750}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
              draggable={false}
            />
          </div>
        ))}
      </div>
      <div className="phulo-slider-controls">
        <p aria-live={paused ? "polite" : "off"} className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
          {slides[active]!.title}
        </p>
        <button type="button" className="phulo-slider-arrow" aria-label="Previous banner" onClick={() => select(active - 1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-1" aria-label="Choose banner">
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              className="phulo-slider-dot"
              aria-label={`Show banner ${index + 1}: ${slide.title}`}
              aria-current={active === index ? "true" : undefined}
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
          aria-label={paused ? "Play banners" : "Pause banners"}
          onClick={() => setPaused((value) => !value)}
          disabled={reducedMotion}
          title={reducedMotion ? "Automatic slides are off for reduced motion" : undefined}
        >{paused ? <Play size={17} /> : <Pause size={17} />}</button>
      </div>
    </section>
  );
}
