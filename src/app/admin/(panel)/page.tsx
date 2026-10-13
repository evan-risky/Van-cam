"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Images,
  RefreshCw,
  TriangleAlert,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet, type AuditEntry, type EventView, type OverviewSession, type OverviewStats } from "@/lib/api-client";

type OverviewResponse = {
  event: EventView;
  stats: OverviewStats;
  recentSessions: OverviewSession[];
  recentAudit: AuditEntry[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet<OverviewResponse>("/api/admin/overview"));
    } catch {
      setError("Gagal memuat ringkasan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <TriangleAlert className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {error ?? "Data tidak tersedia."}
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { stats } = data;
  const quotaUsed =
    stats.quotaTotal > 0
      ? Math.round((stats.uploadedCount / stats.quotaTotal) * 100)
      : 0;

  const cards = [
    {
      label: "Sesi tamu",
      value: stats.sessionCount,
      icon: Users,
      hint: "tamu terdaftar",
    },
    {
      label: "Foto terunggah",
      value: stats.uploadedCount,
      icon: Images,
      hint: `dari ${stats.quotaTotal} kuota`,
    },
    {
      label: "Sedang diproses",
      value: stats.reservedCount,
      icon: Clock,
      hint: "reserve menunggu upload",
    },
    {
      label: "Gagal upload",
      value: stats.failedCount,
      icon: TriangleAlert,
      hint: "perlu retry",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {data.event.name}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardDescription>{card.label}</CardDescription>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="font-heading text-2xl font-semibold tabular-nums">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Progres jepretan</CardTitle>
            <CardDescription>
              {stats.uploadedCount} dari {stats.quotaTotal} kuota acara
              terpakai.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Progress value={quotaUsed} />
            <p className="text-xs text-muted-foreground tabular-nums">
              {quotaUsed}% kuota terpakai
            </p>
            <Separator />
            <div className="flex flex-col gap-3">
              {data.recentSessions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Belum ada sesi tamu.
                </p>
              ) : (
                data.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {session.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-medium">{session.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(session.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {session.uploadedCount}/{session.quota}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivitas terbaru</CardTitle>
            <CardDescription>Audit log aksi penting.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.recentAudit.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Belum ada aktivitas.
              </p>
            ) : (
              data.recentAudit.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[0.65rem]">
                      {log.actorType}
                    </Badge>
                    <span className="text-xs font-medium">{log.action}</span>
                  </div>
                  <span className="text-[0.7rem] text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))
            )}
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <CheckCircle2 className="size-3.5 text-accent" />
              Semua aksi penting dicatat.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}