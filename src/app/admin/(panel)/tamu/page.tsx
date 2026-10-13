"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, type AdminGuest } from "@/lib/api-client";

type GuestsResponse = { guests: AdminGuest[] };

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default function AdminGuestsPage() {
  const [guests, setGuests] = useState<AdminGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<GuestsResponse>("/api/admin/guests");
      setGuests(data.guests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return guests;
    return guests.filter((guest) => guest.name.toLowerCase().includes(term));
  }, [guests, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Daftar tamu</h1>
          <p className="text-sm text-muted-foreground">
            {guests.length} sesi tamu pada acara ini.
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="guest-search" className="sr-only">
          Cari tamu
        </Label>
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="guest-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama tamu…"
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hasil ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading && guests.length === 0 ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full rounded-xl" />
            ))
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada tamu yang cocok.
            </p>
          ) : (
            filtered.map((guest) => {
              const percent =
                guest.quota > 0
                  ? Math.round((guest.uploadedCount / guest.quota) * 100)
                  : 0;
              return (
                <div
                  key={guest.id}
                  className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {guest.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{guest.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Bergabung {formatDateTime(guest.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {guest.uploadedCount}/{guest.quota} foto
                      </span>
                      <div className="flex gap-1">
                        {guest.reservedCount > 0 ? (
                          <Badge variant="outline">
                            {guest.reservedCount} proses
                          </Badge>
                        ) : null}
                        {guest.failedCount > 0 ? (
                          <Badge variant="destructive">
                            {guest.failedCount} gagal
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <Progress value={percent} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}