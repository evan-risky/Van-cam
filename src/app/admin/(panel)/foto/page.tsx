"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Images, RefreshCw } from "lucide-react";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/photo-lightbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, type AdminPhoto } from "@/lib/api-client";

type PhotosResponse = { photos: AdminPhoto[] };

const statusLabel: Record<string, string> = {
  RESERVED: "Proses",
  UPLOADED: "Terunggah",
  FAILED: "Gagal",
};

function formatBytes(value: number | null) {
  if (!value) return "—";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<PhotosResponse>("/api/admin/photos");
      setPhotos(data.photos);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lightboxPhotos: LightboxPhoto[] = photos
    .filter((photo) => photo.status === "UPLOADED")
    .map((photo) => ({
      src: `/api/admin/photos/${photo.id}`,
      caption: `${photo.sessionName} · Foto ${photo.index}`,
      fileName: `vanry-cam-${photo.id}.jpg`,
    }));

  const lightboxIndexByPhotoId = new Map(
    photos
      .filter((photo) => photo.status === "UPLOADED")
      .map((photo, index) => [photo.id, index]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Daftar foto</h1>
          <p className="text-sm text-muted-foreground">
            {photos.length} foto pada acara ini.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Muat ulang
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semua jepretan</CardTitle>
          <CardDescription>
            Foto dipratinjau melalui server. Tautan penyimpanan tidak pernah
            dikirim ke browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && photos.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[4/5] rounded-xl" />
              ))}
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Images className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Belum ada foto yang tersimpan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => {
                const uploadedIndex = lightboxIndexByPhotoId.get(photo.id) ?? -1;
                return (
                  <div
                    key={photo.id}
                    className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    {photo.status === "UPLOADED" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/admin/photos/${photo.id}`}
                          alt={`${photo.sessionName} foto ${photo.index}`}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button
                            variant="secondary"
                            size="icon-sm"
                            aria-label="Lihat foto"
                            onClick={() => {
                              if (uploadedIndex >= 0) {
                                setLightboxIndex(uploadedIndex);
                              }
                            }}
                          >
                            <Eye />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                        <Badge
                          variant={
                            photo.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {statusLabel[photo.status] ?? photo.status}
                        </Badge>
                        <span>{formatBytes(photo.byteSize)}</span>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-[0.65rem] text-white">
                      {photo.sessionName} · {photo.index}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <PhotoLightbox
        photos={lightboxPhotos}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}