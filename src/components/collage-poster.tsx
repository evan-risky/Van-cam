"use client";

import { cn } from "cn";
import { collageGridLayout, POSTER_COLORS } from "@/lib/collage-style";

export type CollagePosterProps = {
  photos: string[];
  couple?: string;
  guest?: string;
  dateLabel?: string;
  className?: string;
};

export function CollagePoster({
  photos,
  couple = "Evan & Inri",
  guest,
  dateLabel,
  className,
}: CollagePosterProps) {
  const { columns } = collageGridLayout(photos.length);
  const total = photos.length;

  return (
    <div
      className={cn("relative w-full", className)}
      style={{ backgroundColor: POSTER_COLORS.paper }}
    >
      <div
        className="relative flex flex-col gap-4 p-5"
        style={{ border: `1px solid ${POSTER_COLORS.line}` }}
      >
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span
              className="text-[0.6rem] tracking-[0.35em] uppercase"
              style={{ color: POSTER_COLORS.accent }}
            >
              Vanry Cam
            </span>
            <span
              className="text-[0.6rem] tracking-[0.25em] uppercase"
              style={{ color: POSTER_COLORS.accent }}
            >
              {total} Frames
            </span>
          </div>
          <h2
            className="text-2xl leading-tight"
            style={{
              color: POSTER_COLORS.ink,
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            {couple}
          </h2>
          <div
            className="h-px w-full"
            style={{ backgroundColor: POSTER_COLORS.line }}
          />
          <p
            className="text-xs"
            style={{
              color: POSTER_COLORS.ink,
              fontStyle: "italic",
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            {guest ? `Catatan dari ${guest}` : "Catatan kecil dari tamu"}
            {dateLabel ? ` · ${dateLabel}` : ""}
          </p>
        </header>

        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {photos.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="relative aspect-square overflow-hidden"
              style={{
                backgroundColor: POSTER_COLORS.white,
                border: `1px solid ${POSTER_COLORS.line}`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Foto ${index + 1}`}
                className="size-full object-cover"
              />
            </div>
          ))}
        </div>

        <footer className="flex items-end justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1">
            <div
              className="h-px w-16"
              style={{ backgroundColor: POSTER_COLORS.accent }}
            />
            <p
              className="text-sm"
              style={{
                color: POSTER_COLORS.ink,
                fontFamily: "'Georgia', 'Times New Roman', serif",
              }}
            >
              Evan + Inri
            </p>
            <p
              className="text-[0.6rem] tracking-[0.25em] uppercase"
              style={{ color: POSTER_COLORS.accent }}
            >
              Muara Teweh · 2026
            </p>
          </div>

          <div
            className="flex size-16 shrink-0 -rotate-12 items-center justify-center rounded-full text-center text-[0.5rem] leading-tight tracking-[0.2em] uppercase"
            style={{
              color: POSTER_COLORS.accent,
              border: `1px solid ${POSTER_COLORS.accent}`,
            }}
          >
            Vanry
            <br />
            Cam
          </div>
        </footer>
      </div>
    </div>
  );
}