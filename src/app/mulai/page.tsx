"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Camera } from "lucide-react";
import { FlowLayout } from "@/components/guest-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/session-provider";
import { clearPhotos } from "@/lib/photo-store";
import {
  DEFAULT_QUOTA,
  GUEST_NAME_MAX,
  GUEST_NAME_MIN,
  QUOTA_OPTIONS,
  type Quota,
} from "@/lib/config";

const quotaDescriptions: Record<Quota, string> = {
  4: "Singkat dan cukup",
  8: "Paling sering dipilih",
  16: "Untuk yang suka jepret",
  32: "Roll penuh satu hari",
};

export default function MulaiPage() {
  const router = useRouter();
  const { ready, session, createSession } = useSession();
  const [name, setName] = useState("");
  const [quota, setQuota] = useState<Quota>(DEFAULT_QUOTA);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) {
      router.replace("/kamera");
    }
  }, [ready, session, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < GUEST_NAME_MIN || trimmed.length > GUEST_NAME_MAX) {
      setError(`Nama harus ${GUEST_NAME_MIN}–${GUEST_NAME_MAX} karakter.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    const result = await createSession({ name: trimmed, quota });
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    await clearPhotos().catch(() => undefined);
    router.push("/kamera");
  }

  if (!ready) {
    return (
      <FlowLayout
        step={1}
        backHref="/"
        title="Perkenalkan dirimu"
        description="Nama ini akan tampil di galeri acaramu."
      >
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </FlowLayout>
    );
  }

  return (
    <FlowLayout
      step={1}
      backHref="/"
      title="Perkenalkan dirimu"
      description="Nama ini akan tampil di galeri acaramu."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="guest-name">Nama tamu</Label>
              <Input
                id="guest-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Rani & Bagas"
                maxLength={GUEST_NAME_MAX}
                autoComplete="name"
                aria-invalid={Boolean(error)}
              />
              <p className="text-xs text-muted-foreground">
                {name.trim().length}/{GUEST_NAME_MAX} karakter
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Jumlah jepretan</Label>
              <RadioGroup
                value={String(quota)}
                onValueChange={(value) => setQuota(Number(value) as Quota)}
                className="grid grid-cols-2 gap-3"
              >
                {QUOTA_OPTIONS.map((option) => (
                  <Label
                    key={option}
                    htmlFor={`quota-${option}`}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/60 has-data-checked:border-accent has-data-checked:bg-accent/10"
                  >
                    <RadioGroupItem
                      id={`quota-${option}`}
                      value={String(option)}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-base font-semibold tabular-nums">
                        {option} foto
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {quotaDescriptions[option]}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Button type="submit" size="lg" disabled={submitting}>
          <Camera className="size-4" />
          {submitting ? "Menyiapkan…" : "Lanjutkan"}
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Kuota dipilih sekali dan divalidasi di server.
        </p>
      </form>
    </FlowLayout>
  );
}