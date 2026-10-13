"use client";

import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type LightboxPhoto = {
  src: string;
  downloadSrc?: string;
  caption: string;
  fileName: string;
};

type PhotoLightboxProps = {
  photos: LightboxPhoto[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: PhotoLightboxProps) {
  const open = index !== null;
  const current = index !== null ? photos[index] : null;

  function go(offset: number) {
    if (index === null || photos.length === 0) return;
    const next = (index + offset + photos.length) % photos.length;
    onIndexChange(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="max-w-3xl gap-3">
        <DialogTitle className="sr-only">
          {current?.caption ?? "Pratinjau foto"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Pratinjau foto dan tombol unduh
        </DialogDescription>

        {current ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.src}
                alt={current.caption}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-muted-foreground">
                {current.caption}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Foto sebelumnya"
                  onClick={() => go(-1)}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Foto berikutnya"
                  onClick={() => go(1)}
                >
                  <ChevronRight />
                </Button>
                <Button
                  size="sm"
                  nativeButton={false}
                  render={
                    <a
                      href={current.downloadSrc ?? current.src}
                      download={current.fileName}
                    />
                  }
                >
                  <Download className="size-4" />
                  Unduh
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}