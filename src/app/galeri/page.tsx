"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, CircleAlert, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { FlowLayout } from "@/components/guest-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/session-provider";
import { clearPhotos } from "@/lib/photo-store";
import { GALLERY_DRIVE_FOLDER_ID, driveFolderEmbedUrl } from "@/lib/config";

function GaleriContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, event, resetSession } = useSession();
  const uploaded = searchParams.get("uploaded") === "1";
  const [iframeKey, setIframeKey] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const embedUrl = driveFolderEmbedUrl(GALLERY_DRIVE_FOLDER_ID);

  useEffect(() => {
    if (uploaded) {
      setIframeKey((prev) => prev + 1);
    }
  }, [uploaded]);

  const reloadIframe = useCallback(() => {
    setLoaded(false);
    setIframeError(null);
    setIframeKey((prev) => prev + 1);
  }, []);

  async function lanjutkanJepret() {
    if (resetting) return;
    setResetError(null);
    setResetting(true);
    const result = await resetSession();
    if (!result.ok) {
      setResetError(result.message);
      setResetting(false);
      return;
    }
    await clearPhotos().catch(() => undefined);
    router.push("/mulai");
  }

  return (
    <FlowLayout
      backHref="/"
      title="Galeri acaramu"
      description="Semua gambar yang diunggah ke folder acara tampil di sini."
      footer={
        <div className="flex flex-col gap-3">
          {resetError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertDescription>{resetError}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => void lanjutkanJepret()}
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {resetting ? "Menyiapkan…" : "Lanjutkan Jepret"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={reloadIframe}
            >
              <RefreshCw className="size-4" />
              Muat ulang
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Lanjutkan Jepret memulai sesi baru dengan kuota baru. Gambar yang
            sudah diunggah tetap tersimpan.
          </p>
        </div>
      }
    >
      {uploaded ? (
        <Alert>
          <Sparkles />
          <AlertTitle>Kolase terunggah</AlertTitle>
          <AlertDescription>
            Kolase milikmu sudah tersimpan di Google Drive. Jika belum muncul,
            tunggu sebentar lalu tekan “Muat ulang”.
          </AlertDescription>
        </Alert>
      ) : null}

      {!ready ? (
        <Skeleton className="h-[70vh] w-full rounded-2xl" />
      ) : (
        <Card className="overflow-hidden py-0">
          <CardContent className="p-0">
            <div className="relative w-full bg-muted">
              {!loaded && !iframeError ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  Memuat galeri acara…
                </div>
              ) : null}

              {iframeError ? (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <CircleAlert className="size-7 text-destructive" />
                  <p className="text-sm font-medium">
                    Galeri tidak dapat dimuat
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pastikan folder Google Drive acara sudah dibagikan (“Siapa
                    saja yang memiliki link” atau akses yang sesuai), lalu coba
                    muat ulang.
                  </p>
                  <Button size="sm" variant="outline" onClick={reloadIframe}>
                    <RefreshCw className="size-3.5" />
                    Coba lagi
                  </Button>
                </div>
              ) : null}

              <iframe
                key={iframeKey}
                src={embedUrl}
                title="Galeri acara di Google Drive"
                loading="lazy"
                scrolling="no"
                onLoad={() => setLoaded(true)}
                onError={() =>
                  setIframeError("Gagal memuat galeri Google Drive.")
                }
                className="block h-[160vh] min-h-[820px] w-full border-0"
              />

              {/*
                Perisai transparan: mencegah klik/tap membuka file di Drive.
                pointer-events auto menahan klik, sementara gulir tetap bekerja
                karena halaman ini (bukan iframe) yang menjadi kontainer gulir.
              */}
              <div
                aria-hidden
                className="absolute inset-0 z-10 cursor-default"
                onClick={(event) => event.preventDefault()}
                onDoubleClick={(event) => event.preventDefault()}
                onContextMenu={(event) => event.preventDefault()}
                onAuxClick={(event) => event.preventDefault()}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Hanya pratinjau — gambar tidak dapat dibuka atau diunduh dari sini.
        {event?.couple ? ` Folder acara ${event.couple}.` : ""}
      </p>
    </FlowLayout>
  );
}

export default function GaleriPage() {
  return (
    <Suspense
      fallback={
        <FlowLayout
          backHref="/"
          title="Galeri acaramu"
          description="Memuat galeri acara…"
        >
          <Skeleton className="h-[70vh] w-full rounded-2xl" />
        </FlowLayout>
      }
    >
      <GaleriContent />
    </Suspense>
  );
}
