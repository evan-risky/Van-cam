"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check, Download, Printer, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, type EventView } from "@/lib/api-client";

type EventResponse = { event: EventView };

export default function AdminQrPage() {
  const [event, setEvent] = useState<EventView | null>(null);
  const [copied, setCopied] = useState(false);
  const qrWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void apiGet<EventResponse>("/api/event")
      .then((data) => setEvent(data.event))
      .catch(() => setEvent(null));
  }, []);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = event ? `${baseUrl}/?acara=${event.slug}` : baseUrl;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadQr() {
    const canvas = qrWrapperRef.current?.querySelector("canvas");
    if (!canvas || !event) return;
    const anchor = document.createElement("a");
    anchor.href = canvas.toDataURL("image/png");
    anchor.download = `vanry-cam-${event.slug}-qr.png`;
    anchor.click();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">QR acara</h1>
        <p className="text-sm text-muted-foreground">
          Satu QR dan satu tautan untuk seluruh acara.
        </p>
      </div>

      <Alert>
        <QrCode />
        <AlertDescription>
          QR ini untuk seluruh acara. Jangan membuat QR per meja.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kode QR</CardTitle>
            <CardDescription>
              Cetak atau tampilkan QR ini agar tamu dapat memindai.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {event ? (
              <>
                <div
                  ref={qrWrapperRef}
                  className="rounded-xl border border-border bg-white p-4"
                >
                  <QRCodeCanvas
                    value={link}
                    size={220}
                    level="M"
                    marginSize={2}
                    bgColor="#ffffff"
                    fgColor="#243b32"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadQr}>
                    <Download className="size-4" />
                    Unduh PNG
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                  >
                    <Printer className="size-4" />
                    Cetak
                  </Button>
                </div>
              </>
            ) : (
              <Skeleton className="size-[252px] rounded-xl" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tautan acara</CardTitle>
            <CardDescription>
              Bagikan tautan ini bila tamu tidak bisa memindai QR.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="event-link">URL</Label>
              <div className="flex items-center gap-2">
                <input
                  id="event-link"
                  readOnly
                  value={link}
                  onFocus={(inputEvent) => inputEvent.currentTarget.select()}
                  className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                />
                <Button size="sm" onClick={copyLink}>
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Tersalin
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Salin
                    </>
                  )}
                </Button>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Acara</dt>
                <dd className="font-medium">{event?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tanggal</dt>
                <dd className="font-medium">{event?.dateLabel ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Lokasi</dt>
                <dd className="font-medium">{event?.location ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kode acara</dt>
                <dd className="font-medium">{event?.slug ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}