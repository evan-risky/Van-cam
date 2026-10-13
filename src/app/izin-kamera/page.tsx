"use client";

import { useRouter } from "next/navigation";
import { Camera, MapPinOff, MicOff, ShieldCheck } from "lucide-react";
import { FlowLayout } from "@/components/guest-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const guarantees = [
  { icon: Camera, label: "Hanya kamera yang digunakan" },
  { icon: MicOff, label: "Mikrofon tidak diminta" },
  { icon: MapPinOff, label: "Lokasi dan file tidak diakses" },
];

export default function IzinKameraPage() {
  const router = useRouter();

  return (
    <FlowLayout
      step={2}
      backHref="/mulai"
      title="Izin kamera"
      description="Vanry Cam butuh akses kamera untuk mengambil jepretanmu."
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => router.push("/kamera")}
        >
          <Camera className="size-4" />
          Izinkan Kamera
        </Button>
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <ShieldCheck className="size-6" />
          </span>
          <ul className="flex flex-col gap-3">
            {guarantees.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                <item.icon className="size-4 text-muted-foreground" />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Browser akan menampilkan permintaan izin kamera saat kamu menekan
            tombol di bawah. Kamera hanya aktif di halaman kamera.
          </p>
        </CardContent>
      </Card>
    </FlowLayout>
  );
}