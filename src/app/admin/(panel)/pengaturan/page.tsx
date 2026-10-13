"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, ApiError, type EventView } from "@/lib/api-client";

type EventResponse = { event: EventView };

export default function AdminSettingsPage() {
  const [event, setEvent] = useState<EventView | null>(null);
  const [form, setForm] = useState({
    name: "",
    couple: "",
    location: "",
    dateLabel: "",
    year: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<EventResponse>("/api/admin/event");
      setEvent(data.event);
      setForm({
        name: data.event.name,
        couple: data.event.couple,
        location: data.event.location,
        dateLabel: data.event.dateLabel,
        year: String(data.event.year),
      });
    } catch {
      setError("Gagal memuat pengaturan acara.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, year: Number(form.year) }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new ApiError(
          response.status,
          "update_failed",
          data.message ?? "Gagal menyimpan.",
        );
      }
      const data = (await response.json()) as EventResponse;
      setEvent(data.event);
      setMessage("Pengaturan acara tersimpan.");
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Gagal menyimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Pengaturan acara</h1>
        <p className="text-sm text-muted-foreground">
          Perbarui informasi acara yang tampil untuk tamu.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi acara</CardTitle>
          <CardDescription>
            Perubahan langsung berlaku pada halaman tamu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !event ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <form onSubmit={save} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="event-name">Nama acara</Label>
                  <Input
                    id="event-name"
                    value={form.name}
                    maxLength={120}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="event-couple">Nama pasangan</Label>
                  <Input
                    id="event-couple"
                    value={form.couple}
                    maxLength={120}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        couple: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="event-location">Lokasi</Label>
                  <Input
                    id="event-location"
                    value={form.location}
                    maxLength={120}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        location: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="event-year">Tahun</Label>
                  <Input
                    id="event-year"
                    type="number"
                    min={2000}
                    max={2100}
                    value={form.year}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, year: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="event-date">Tanggal (teks tampilan)</Label>
                <Input
                  id="event-date"
                  value={form.dateLabel}
                  maxLength={120}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      dateLabel: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              {message ? (
                <Alert>
                  <CheckCircle2 className="size-4 text-accent" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" disabled={saving} className="self-start">
                <Save className="size-4" />
                {saving ? "Menyimpan…" : "Simpan perubahan"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}