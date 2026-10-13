import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardFailure, requireAdminEvent } from "@/lib/admin-guard";
import { writeAuditLog } from "@/lib/audit";

const MAX_TEXT = 120;

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TEXT) return null;
  return trimmed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const guard = await requireAdminEvent(request, slug);
  if (isGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }
  return NextResponse.json({ event: guard.event });
}

export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const guard = await requireAdminEvent(request, slug);
  if (isGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body tidak valid." },
      { status: 400 },
    );
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const name = cleanText(payload.name);
  const couple = cleanText(payload.couple);
  const location = cleanText(payload.location);
  const dateLabel = cleanText(payload.dateLabel);
  const year =
    typeof payload.year === "number" && Number.isInteger(payload.year)
      ? payload.year
      : null;

  if (!name || !couple || !location || !dateLabel || year === null) {
    return NextResponse.json(
      { error: "invalid_input", message: "Semua kolom wajib diisi dengan benar." },
      { status: 400 },
    );
  }
  if (year < 2000 || year > 2100) {
    return NextResponse.json(
      { error: "invalid_year", message: "Tahun tidak wajar." },
      { status: 400 },
    );
  }

  const updated = await prisma.event.update({
    where: { id: guard.event.id },
    data: { name, couple, location, dateLabel, year },
    select: {
      id: true,
      name: true,
      slug: true,
      couple: true,
      location: true,
      dateLabel: true,
      year: true,
    },
  });

  await writeAuditLog({
    organizationId: guard.event.organizationId,
    actorType: "admin",
    actorId: guard.user.id,
    action: "event.update",
    targetType: "event",
    targetId: guard.event.id,
    metadata: { name, couple, location, dateLabel, year },
  });

  return NextResponse.json({ event: updated });
}