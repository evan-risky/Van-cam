import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventBySlug } from "@/lib/event";
import { getGuestToken, guestTokenHash } from "@/lib/guest-session";
import { DEFAULT_EVENT_SLUG } from "@/lib/config";
import { reservePhoto } from "@/lib/quota";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(`reserve:${clientIp(request)}`, 60, 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body tidak valid." },
      { status: 400 },
    );
  }

  const payload = (body ?? {}) as { idempotencyKey?: unknown; slug?: unknown };
  const idempotencyKey = payload.idempotencyKey;
  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 128
  ) {
    return NextResponse.json(
      {
        error: "invalid_idempotency_key",
        message: "idempotencyKey harus 8–128 karakter.",
      },
      { status: 400 },
    );
  }

  const slug =
    typeof payload.slug === "string" && payload.slug.length > 0
      ? payload.slug
      : DEFAULT_EVENT_SLUG;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json(
      { error: "event_not_found", message: "Acara tidak ditemukan." },
      { status: 404 },
    );
  }

  const token = await getGuestToken();
  if (!token) {
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }

  const session = await prisma.guestSession.findUnique({
    where: {
      eventId_anonymousTokenHash: {
        eventId: event.id,
        anonymousTokenHash: guestTokenHash(token),
      },
    },
    select: { id: true },
  });
  if (!session) {
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }

  const result = await reservePhoto({
    sessionId: session.id,
    eventId: event.id,
    idempotencyKey,
  });

  if (!result.ok) {
    if (result.reason === "quota_exceeded") {
      await writeAuditLog({
        actorType: "guest",
        actorId: session.id,
        action: "photo.reserve.rejected",
        targetType: "guest_session",
        targetId: session.id,
        metadata: { eventId: event.id, reason: "quota_exceeded" },
      });
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: "Kuota jepretan sudah habis.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }

  await writeAuditLog({
    actorType: "guest",
    actorId: session.id,
    action: result.reused ? "photo.reserve.reused" : "photo.reserve",
    targetType: "photo",
    targetId: result.photo.id,
    metadata: { eventId: event.id, index: result.photo.index },
  });

  return NextResponse.json({
    photo: result.photo,
    used: result.used,
    quota: result.quota,
  });
}