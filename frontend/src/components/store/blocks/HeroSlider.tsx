"use client";

/** Auto-advancing hero slider with dots and arrows. */
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Slide = {
  image: string;
  heading?: string;
  subheading?: string;
  buttonText?: string;
  buttonLink?: string;
};

export function HeroSlider({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const next = useCallback(() => setIndex((i) => (i + 1) % slides.length), [slides.length]);
  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next, slides.length]);

  if (!slides.length) return null;

  return (
    <section className="relative overflow-hidden bg-zinc-900" aria-roledescription="carousel">
      <div className="relative aspect-[8/3] min-h-64 w-full">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-hidden={i !== index}
          >
            {slide.image && (
              <Image src={slide.image} alt={slide.heading ?? ""} fill unoptimized priority={i === 0} className="object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/25 to-transparent" />
            <div className="absolute inset-0 mx-auto flex max-w-7xl flex-col items-start justify-center gap-3 px-6 sm:px-10">
              {slide.heading && (
                <h2 className="max-w-xl text-2xl font-extrabold leading-tight text-white drop-shadow sm:text-4xl lg:text-5xl">
                  {slide.heading}
                </h2>
              )}
              {slide.subheading && <p className="max-w-md text-sm text-zinc-200 sm:text-base">{slide.subheading}</p>}
              {slide.buttonText && slide.buttonLink && (
                <Link href={slide.buttonLink}>
                  <Button size="lg" className="mt-2 bg-blue-600 font-semibold text-white shadow-lg hover:bg-blue-700">
                    {slide.buttonText}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous slide" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors hover:bg-white/30">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={next} aria-label="Next slide" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors hover:bg-white/30">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-white" : "w-2 bg-white/50")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
