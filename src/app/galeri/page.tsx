"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  ImageOff,
  Lock,
  RefreshCw,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { FlowLayout } from "@/components/guest-shell";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/photo-lightbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/session-provider";
import {
  apiGet,
  collageDownloadUrl,
  collagePreviewUrl,
  type EventView,
  type MyCollage,
  type MyPhoto,
} from "@/lib/api-client";

type PhotosResponse = {
  event: EventView;
  session: { id: string; name: string; quota: number; status: string };
  photos: MyPhoto[];
};

type CollageResponse = { collage: MyCollage | null };

export default function GaleriPage() {
  const { ready, session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<MyPhoto[]>([]);
  const [collage, setCollage] = useState<MyCollage | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, collageData] = await Promise.all([
        apiGet<PhotosResponse>("/api/sessions/me/photos"),
        apiGet<CollageResponse>("/api/sessions/me/collage"),
      ]);
      setPhotos(data.photos);
      setCollage(collageData.collage);
    } catch {
      setError("Gagal memuat galeri. Periksa koneksimu lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready || !session) {
      if (ready) setLoading(false);
      return;
    }
    void load();
  }, [ready, session, load]);

  if (ready && !session) {
    return (
      <FlowLayout
        backHref="/"
        title="Galeri acara"
        description="Kamu belum memulai sesi kamera."
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-6" />
            </span>
            <p className="font-medium">Belum ada sesi</p>
            <p className="text-sm text-muted-foreground">
              Mulai jepret untuk membuat sesi kamera dan membuka galerimu.
            </p>
            <Button nativeButton={false} render={<Link href="/mulai" />}>
              Mulai Jepret
            </Button>
          </CardContent>
        </Card>
      </FlowLayout>
    );
  }

  const lightboxPhotos: LightboxPhoto[] = photos.map((photo) => ({
    src: `/api/photos/${photo.id}/download?inline=1`,
    downloadSrc: `/api/photos/${photo.id}/download`,
    caption: `${session?.name ?? "Tamu"} · Foto ${photo.index}`,
    fileName: `vanry-cam-foto-${photo.index}.jpg`,
  }));

  const collageUploaded = collage?.status === "UPLOADED";
  const hasContent = collageUploaded || photos.length > 0;

  return (
    <FlowLayout
      backHref="/kamera"
      title="Galeri acaramu"
      description="Kolase dan foto milik sesimu tampil di sini."
      footer={
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              className="flex-1"
              nativeButton={false}
              render={<Link href="/kolase" />}
            >
              <Sparkles className="size-4" />
              {collageUploaded ? "Ubah Kolase" : "Buat Kolase"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              nativeButton={false}
              render={<Link href="/kamera" />}
            >
              Lanjut Jepret
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Muat ulang
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/5] w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Gagal memuat galeri</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => void load()}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      ) : !hasContent ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <ImageOff className="size-8 text-muted-foreground" />
            <p className="font-medium">Belum ada kolase</p>
            <p className="text-sm text-muted-foreground">
              Buat kolase dari jepretanmu untuk melihatnya di galeri.
            </p>
            <Button nativeButton={false} render={<Link href="/kolase" />}>
              Buat Kolase
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {collageUploaded && collage ? (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Kolase acaramu</p>
                  <span className="flex items-center gap-1 text-xs text-accent">
                    <Sparkles className="size-3.5" />
                    Kolase
                  </span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={collagePreviewUrl(collage.id)}
                  alt={`Kolase ${session?.name ?? "Tamu"}`}
                  className="w-full rounded-xl border border-border object-cover"
                />
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={collageDownloadUrl(collage.id)} />}
                >
                  <Download className="size-4" />
                  Unduh kolase
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {photos.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {lightboxPhotos.map((photo, index) => (
                  <button
                    key={photo.fileName}
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.src}
                      alt={photo.caption}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 text-[0.7rem] text-white">
                      <span className="truncate">Foto {photos[index]?.index}</span>
                      <Download className="size-3.5 shrink-0" />
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Ketuk foto untuk memperbesar dan mengunduh.
              </p>
            </>
          ) : null}
        </>
      )}

      <PhotoLightbox
        photos={lightboxPhotos}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </FlowLayout>
  );
}