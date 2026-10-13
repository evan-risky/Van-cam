import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export function GuestHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Brand />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/mulai" />}
          >
            Mulai Jepret
          </Button>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/galeri" />}
          >
            Galeri
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin" />}
          >
            Admin
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function GuestFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Vanry Cam &middot; Kamera disposable</p>
        <p>Dibuat untuk pernikahan Evan &amp; Inri</p>
      </div>
    </footer>
  );
}

type FlowLayoutProps = {
  title: string;
  description?: string;
  step?: number;
  totalSteps?: number;
  backHref?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function FlowLayout({
  title,
  description,
  step,
  totalSteps = 4,
  backHref,
  children,
  footer,
}: FlowLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="flex items-center gap-2">
            {backHref ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Kembali"
                nativeButton={false}
                render={<Link href={backHref} />}
              >
                <ArrowLeft />
              </Button>
            ) : null}
            <Brand />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex flex-col gap-2">
          {step ? (
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <span>
                Langkah {step} dari {totalSteps}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-accent transition-all"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </span>
            </div>
          ) : null}
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">{children}</div>
      </main>

      {footer ? (
        <div className="sticky bottom-0 border-t border-border/60 bg-background/90 backdrop-blur-md">
          <div className="mx-auto w-full max-w-[480px] px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {footer}
          </div>
        </div>
      ) : null}
    </div>
  );
}