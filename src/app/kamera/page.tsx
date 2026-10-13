"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  CameraOff,
  Check,
  CircleAlert,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  SwitchCamera,
  Trash2,
} from "lucide-react";
import { FlowLayout } from "@/components/guest-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/components/session-provider";
import { captureFrame } from "@/lib/image-capture";
import {
  addPhoto,
  clearPhotos,
  isPhotoStoreSupported,
  listPhotos,
  newIdempotencyKey,
  removePhoto,
  type LocalPhoto,
} from "@/lib/photo-store";

type CameraStatus = "idle" | "starting" | "ready" | "denied" | "unavailable";

function LocalThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (!url) {
    return <div className="size-full bg-muted" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Pratinjau jepretan" className="size-full object-cover" />
  );
}

export default function KameraPage() {
  const router = useRouter();
  const { ready, session } = useSession();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [captureBusy, setCaptureBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [secure, setSecure] = useState<boolean | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const quota = session?.quota ?? 0;
  const taken = photos.length;
  const remaining = Math.max(quota - taken, 0);
  const progress = quota > 0 ? Math.round((taken / quota) * 100) : 0;
  const quotaFull = quota > 0 && taken >= quota;

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(
    async (mode: "user" | "environment") => {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraStatus("unavailable");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unavailable");
        return;
      }
      setCameraStatus("starting");
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode, width: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setCameraStatus("ready");
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        setCameraStatus(
          name === "NotAllowedError" || name === "SecurityError"
            ? "denied"
            : "unavailable",
        );
      }
    },
    [stopStream],
  );

  const loadLocal = useCallback(async () => {
    const stored = await listPhotos();
    setPhotos(stored);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (ready && !session) {
      router.replace("/mulai");
    }
  }, [ready, session, router]);

  useEffect(() => {
    setSecure(window.isSecureContext);
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadLocal();
  }, [session, loadLocal]);

  useEffect(() => {
    void startStream(facing);
    return () => stopStream();
  }, [facing, startStream, stopStream]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stopStream();
      else void startStream(facing);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [facing, startStream, stopStream]);

  async function shoot() {
    if (captureBusy) return;
    if (cameraStatus !== "ready" || !videoRef.current) {
      setCameraError("Kamera belum siap. Tunggu sebentar atau izinkan kamera.");
      return;
    }

    const current = await listPhotos();
    if (current.length >= quota) return;

    setCameraError(null);
    setCaptureBusy(true);
    try {
      const { blob, mimeType } = await captureFrame(videoRef.current);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 150);

      const id = newIdempotencyKey();
      await addPhoto({
        id,
        idempotencyKey: id,
        blob,
        mimeType,
        size: blob.size,
        capturedAt: Date.now(),
      });
      await loadLocal();
    } catch {
      setCameraError("Gagal mengambil gambar dari kamera. Coba lagi.");
    } finally {
      setCaptureBusy(false);
    }
  }

  async function removeOne(id: string) {
    await removePhoto(id);
    await loadLocal();
  }

  async function retake(id: string) {
    if (captureBusy) return;
    await removePhoto(id);
    await loadLocal();
    await shoot();
  }

  async function removeAll() {
    if (!window.confirm("Buang semua jepretan?")) return;
    await clearPhotos();
    await loadLocal();
  }

  if (!ready || !session || !loaded) {
    return (
      <FlowLayout step={3} title="Kamera" description="Menyiapkan sesi tamu…">
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            Memuat kamera
          </CardContent>
        </Card>
      </FlowLayout>
    );
  }

  if (secure === false) {
    return (
      <FlowLayout
        step={3}
        backHref="/izin-kamera"
        title="Kamera membutuhkan HTTPS"
        description="Browser hanya mengizinkan kamera pada koneksi aman (HTTPS) atau localhost."
      >
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertDescription>
            Kamera membutuhkan HTTPS. Gunakan Cloudflare Tunnel atau deploy ke
            Vercel untuk pengujian di HP.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => setHelpOpen(true)}>
          <ShieldAlert className="size-4" />
          Cara Testing di HP
        </Button>
        <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      </FlowLayout>
    );
  }

  if (!isPhotoStoreSupported()) {
    return (
      <FlowLayout
        step={3}
        backHref="/izin-kamera"
        title="Kamera"
        description="Penyimpanan lokal tidak tersedia."
      >
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>
            Browser ini tidak mengizinkan penyimpanan lokal (IndexedDB). Matikan
            mode privat atau buka lewat Chrome di Android / Safari di iPhone,
            lalu muat ulang halaman ini.
          </AlertDescription>
        </Alert>
      </FlowLayout>
    );
  }

  return (
    <FlowLayout
      step={3}
      backHref="/izin-kamera"
      title="Kamera"
      description="Ambil foto sesuai kuota, hapus atau ambil ulang bila perlu, lalu buat kolase."
      footer={
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {taken} dari {quota} jepretan
            </span>
            <span className="tabular-nums">{progress}%</span>
          </div>
          <Progress value={progress} />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Ganti kamera"
              disabled={captureBusy || cameraStatus === "starting"}
              onClick={() =>
                setFacing((prev) =>
                  prev === "user" ? "environment" : "user",
                )
              }
            >
              <SwitchCamera />
            </Button>
            <Button
              size="lg"
              className="h-14 flex-1"
              disabled={captureBusy || remaining <= 0 || cameraStatus !== "ready"}
              onClick={() => void shoot()}
            >
              {captureBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyimpan…
                </>
              ) : remaining <= 0 ? (
                <>
                  <Check className="size-4" />
                  Kuota penuh
                </>
              ) : (
                <>
                  <Camera className="size-4" />
                  Jepret
                </>
              )}
            </Button>
          </div>
          {quotaFull ? (
            <Button
              size="lg"
              className="h-12 w-full"
              onClick={() => router.push("/kolase")}
            >
              <Sparkles className="size-4" />
              Buat Kolase
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Tombol Buat Kolase muncul setelah {quota} foto terkumpul.
            </p>
          )}
        </div>
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-primary">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`aspect-[3/4] w-full object-cover ${
            facing === "user" ? "scale-x-[-1]" : ""
          } ${cameraStatus === "ready" ? "" : "invisible"}`}
        />

        {cameraStatus !== "ready" ? (
          <div className="absolute inset-0 flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 text-primary-foreground">
            {cameraStatus === "starting" ? (
              <>
                <Loader2 className="size-8 animate-spin opacity-70" />
                <p className="text-sm opacity-80">Menyalakan kamera…</p>
              </>
            ) : (
              <>
                <CameraOff className="size-10 opacity-80" />
                <p className="text-sm opacity-80">
                  {cameraStatus === "denied"
                    ? "Akses kamera ditolak"
                    : "Kamera tidak tersedia"}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => startStream(facing)}
                >
                  <RotateCcw className="size-3.5" />
                  Coba lagi
                </Button>
              </>
            )}
          </div>
        ) : null}

        {flash ? (
          <div className="absolute inset-0 bg-white/80" aria-hidden />
        ) : null}

        <div className="absolute top-3 left-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
          {taken}/{quota}
        </div>
      </div>

      {cameraError ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{cameraError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCameraError(null)}
            >
              Tutup
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {photos.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Jepretan ({taken})</p>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => void removeAll()}
            >
              <Trash2 className="size-3.5" />
              Buang semua
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="flex flex-col gap-1 overflow-hidden rounded-lg border border-border"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <LocalThumb blob={photo.blob} />
                  <span className="absolute top-1 left-1 rounded-full bg-black/60 px-2 py-0.5 text-[0.6rem] text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 p-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus foto ${index + 1}`}
                    disabled={captureBusy}
                    onClick={() => void removeOne(photo.id)}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ambil ulang foto ${index + 1}`}
                    disabled={captureBusy || cameraStatus !== "ready"}
                    onClick={() => void retake(photo.id)}
                  >
                    <RotateCcw />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Camera className="size-6" />
            Belum ada jepretan. Tekan tombol Jepret untuk mulai.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 text-xs text-muted-foreground">
          Foto disimpan sementara di perangkatmu (IndexedDB). Kolase dibuat dari
          foto ini dan hanya kolase yang diunggah ke Google Drive.
        </CardContent>
      </Card>
    </FlowLayout>
  );
}

function HelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cara Testing di HP</DialogTitle>
          <DialogDescription>
            Akses kamera butuh HTTPS. Ikuti salah satu langkah berikut.
          </DialogDescription>
        </DialogHeader>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            Jalankan aplikasi di komputer:{" "}
            <code className="rounded bg-muted px-1">npm run dev</code>.
          </li>
          <li>
            Pasang Cloudflare Tunnel, lalu jalankan:{" "}
            <code className="rounded bg-muted px-1">
              cloudflared tunnel --url http://localhost:3000
            </code>
            .
          </li>
          <li>
            Buka URL <code className="rounded bg-muted px-1">https://...trycloudflare.com</code>{" "}
            yang muncul di HP.
          </li>
          <li>
            Alternatif: deploy ke Vercel (sudah HTTPS) lalu buka domainnya di HP.
          </li>
          <li>
            Di HP, buka halaman kamera dan izinkan akses kamera saat diminta.
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}