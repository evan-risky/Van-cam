"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  Download,
  ImageOff,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { CollagePoster } from "@/components/collage-poster";
import { FlowLayout } from "@/components/guest-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/session-provider";
import {
  apiGet,
  apiUploadForm,
  ApiError,
  collageDownloadUrl,
  collageImageUrl,
  type MyCollage,
} from "@/lib/api-client";
import { composeCollage } from "@/lib/collage-compose";
import { collageGrid } from "@/lib/collage-style";
import { listPhotos, newIdempotencyKey, type LocalPhoto } from "@/lib/photo-store";

type CollageResponse = { collage: MyCollage | null };

export default function KolasePage() {
  const router = useRouter();
  const { ready, session, event } = useSession();

  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [saved, setSaved] = useState<MyCollage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const blobRef = useRef<Blob | null>(null);
  const keyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [local, collageData] = await Promise.all([
        listPhotos(),
        apiGet<CollageResponse>("/api/sessions/me/collage"),
      ]);
      setPhotos(local);
      setSaved(collageData.collage);
      setVersion((prev) => prev + 1);
    } catch {
      setError("Gagal memuat data kolase. Coba lagi.");
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

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo.blob));
    setPhotoUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function build() {
    if (composing || uploading) return;
    setError(null);

    if (photos.length === 0) {
      setError("Belum ada foto. Jepret dulu di halaman kamera.");
      return;
    }

    setComposing(true);
    setProgress("Menyusun kolase…");
    try {
      const blob = await composeCollage({
        blobs: photos.map((photo) => photo.blob),
        couple: event?.couple,
        guest: session?.name,
        dateLabel: event?.dateLabel,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      blobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
      keyRef.current = newIdempotencyKey();
      setProgress(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal membuat kolase.";
      setError(message);
      setProgress(null);
    } finally {
      setComposing(false);
    }
  }

  async function upload() {
    if (uploading || composing) return;
    if (!blobRef.current) {
      setError("Buat kolase dulu sebelum mengunggah.");
      return;
    }
    setError(null);
    setUploading(true);
    setProgress("Mengunggah kolase ke Google Drive…");
    try {
      if (!keyRef.current) keyRef.current = newIdempotencyKey();
      const form = new FormData();
      form.append(
        "file",
        blobRef.current,
        `vanry-collage-${session?.id ?? "tamu"}.jpg`,
      );
      form.append("idempotencyKey", keyRef.current);
      form.append("photoCount", String(photos.length));

      await apiUploadForm<{ collage: MyCollage }>(
        "/api/upload/collage",
        form,
      );

      const fresh = await apiGet<CollageResponse>("/api/sessions/me/collage");
      setSaved(fresh.collage);
      setVersion((prev) => prev + 1);
      setProgress(null);
      router.push("/galeri");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Gagal mengunggah kolase. Coba lagi.";
      setError(message);
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  if (ready && !session) {
    return (
      <FlowLayout
        backHref="/"
        title="Kolase acara"
        description="Kamu belum memulai sesi kamera."
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <ImageOff className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Mulai jepret dulu untuk membuat kolase dari foto milikmu.
            </p>
            <Button nativeButton={false} render={<Link href="/mulai" />}>
              Mulai Jepret
            </Button>
          </CardContent>
        </Card>
      </FlowLayout>
    );
  }

  const grid = collageGrid(photos.length);
  const busy = composing || uploading;
  const canUpload = Boolean(previewUrl);
  const savedUploaded = saved?.status === "UPLOADED";

  return (
    <FlowLayout
      backHref="/kamera"
      title="Buat kolase"
      description="Susun jepretanmu menjadi satu kolase, lalu unduh atau unggah ke Google Drive."
      footer={
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void build()}
            disabled={busy || photos.length === 0}
          >
            {composing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LayoutGrid className="size-4" />
            )}
            Buat Kolase
          </Button>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              nativeButton={false}
              render={
                <a
                  href={previewUrl ?? "#"}
                  download="vanry-cam-kolase.jpg"
                  aria-disabled={!previewUrl}
                />
              }
            >
              <Download className="size-4" />
              Download Kolase
            </Button>
            <Button
              className="flex-1"
              onClick={() => void upload()}
              disabled={busy || !canUpload}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Mengunggah…
                </>
              ) : (
                <>
                  <UploadCloud className="size-4" />
                  Unggah Kolase
                </>
              )}
            </Button>
          </div>
        </div>
      }
    >
      {loading ? (
        <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
      ) : (
        <>
          {error ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Gagal</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => void load()}
                >
                  <RefreshCw className="size-3.5" />
                  Muat ulang
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {progress ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {progress}
            </p>
          ) : null}

          {previewUrl ? (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-4">
                <p className="text-sm font-medium">Hasil kolase</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Hasil kolase"
                  className="w-full rounded-xl border border-border"
                />
              </CardContent>
            </Card>
          ) : savedUploaded && saved ? (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-4">
                <p className="text-sm font-medium">Kolase tersimpan</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${collageImageUrl(saved.id)}?v=${version}`}
                  alt={`Kolase ${session?.name ?? "Tamu"}`}
                  className="w-full rounded-xl border border-border"
                />
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<a href={collageDownloadUrl(saved.id)} />}
                >
                  <Download className="size-4" />
                  Unduh kolase
                </Button>
              </CardContent>
            </Card>
          ) : photos.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Pratinjau kolase</p>
              <CollagePoster
                photos={photoUrls}
                couple={event?.couple}
                guest={session?.name}
                dateLabel={event?.dateLabel}
                className="rounded-xl border border-border"
              />
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                <Sparkles className="size-7" />
                Belum ada kolase. Tekan “Buat Kolase”.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="flex flex-col gap-4 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Foto untuk kolase</span>
                <span className="tabular-nums text-muted-foreground">
                  {photos.length} foto
                </span>
              </div>

              {photos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {photos.map((photo) => (
                    <LocalThumb key={photo.id} blob={photo.blob} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Belum ada foto. Buka kamera untuk menjepret.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Tata letak {grid.columns} x {grid.rows}. Kolase dibuat dari foto
                yang tersimpan di perangkat; hanya kolase yang diunggah ke Google
                Drive, bukan foto terpisah.
              </p>

              {photos.length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/kamera" />}
                >
                  Buka kamera
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </FlowLayout>
  );
}

function LocalThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  return (
    <div className="aspect-square overflow-hidden rounded-lg border border-border bg-muted">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Foto kolase" className="size-full object-cover" />
      ) : null}
    </div>
  );
}