"use client";

import Link from "next/link";
import { Camera, Hourglass, Sparkles, UploadCloud } from "lucide-react";
import { GuestFooter, GuestHeader } from "@/components/guest-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/components/session-provider";

const steps = [
  {
    icon: Camera,
    title: "Jepret",
    description:
      "Buka kamera dan ambil foto sampai kuota jepretanmu habis. Tidak ada filter, tidak ada pratinjau.",
  },
  {
    icon: UploadCloud,
    title: "Simpan",
    description:
      "Setiap jepretan langsung tersimpan dan hanya bisa dibuka olehmu.",
  },
  {
    icon: Hourglass,
    title: "Lihat",
    description:
      "Setelah roll selesai, galeri langsung terbuka. Lihat dan unduh fotomu kapan saja.",
  },
];

export default function LandingPage() {
  const { event } = useSession();
  const couple = event?.couple ?? "Evan & Inri";

  return (
    <div className="flex min-h-dvh flex-col">
      <GuestHeader />

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-12 sm:py-16 md:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <Badge className="gap-1.5 tracking-wide uppercase">
              <Sparkles className="size-3" />
              Disposable Camera
            </Badge>
            <h1 className="font-heading text-4xl leading-tight font-semibold text-balance sm:text-5xl">
              Tangkap momen malam ini, lihat hasilnya segera.
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              Vanry Cam adalah kamera disposable untuk pernikahan {couple}.
              Jepret sampai roll habis, lalu galeri langsung terbuka.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/mulai" />}
              >
                <Camera className="size-4" />
                Mulai Jepret
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={<Link href="/galeri" />}
              >
                Lihat Galeri
              </Button>
            </div>
            {event ? (
              <p className="text-xs text-muted-foreground">
                {event.dateLabel} &middot; {event.location}
              </p>
            ) : null}
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-accent/10 blur-2xl" />
            <Card className="overflow-hidden py-0">
              <div className="flex aspect-[4/5] flex-col justify-between bg-gradient-to-br from-primary via-primary to-accent/70 p-6 text-primary-foreground">
                <div className="flex items-center justify-between text-xs tracking-[0.25em] uppercase opacity-80">
                  <span>Vanry Cam</span>
                  <span>{couple}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-5xl font-semibold tabular-nums">
                    08
                  </span>
                  <span className="text-sm opacity-80">
                    jepretan per tamu
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs opacity-80">
                  <span>Roll pernikahan</span>
                  <span>{event?.year ?? ""}</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/60">
          <div className="mx-auto w-full max-w-5xl px-4 py-12">
            <h2 className="font-heading text-2xl font-semibold">
              Tiga langkah, satu cerita
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Cukup satu tautan untuk seluruh acara. Tanpa aplikasi, tanpa
              unduhan.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {steps.map((step) => (
                <Card key={step.title} className="h-full">
                  <CardHeader>
                    <span className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                      <step.icon className="size-5" />
                    </span>
                    <CardTitle className="mt-2">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <div
              className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-accent/40 blur-3xl"
              aria-hidden
            />
            <div className="relative flex flex-col items-center gap-5">
              <h2 className="font-heading text-3xl font-semibold text-balance">
                Siap jadi bagian dari cerita?
              </h2>
              <p className="max-w-md text-sm text-primary-foreground/80">
                Mulai jepret sekarang dan lihat hasilnya begitu roll selesai.
              </p>
              <Button
                size="lg"
                variant="secondary"
                nativeButton={false}
                render={<Link href="/mulai" />}
              >
                <Camera className="size-4" />
                Mulai Jepret
              </Button>
            </div>
          </div>
        </section>
      </main>

      <GuestFooter />
    </div>
  );
}