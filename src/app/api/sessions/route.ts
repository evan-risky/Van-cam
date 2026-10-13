import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventBySlug } from "@/lib/event";
import {
  buildGuestCookie,
  createGuestToken,
  guestTokenHash,
  readGuestToken,
} from "@/lib/guest-session";
import { DEFAULT_EVENT_SLUG, isQuota, isValidGuestName } from "@/lib/config";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(`session:${clientIp(request)}`, 20, 60 * 1000);
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

  const payload = (body ?? {}) as {
    name?: unknown;
    quota?: unknown;
    slug?: unknown;
  };

  if (!isValidGuestName(payload.name)) {
    return NextResponse.json(
      { error: "invalid_name", message: "Nama harus 2–60 karakter." },
      { status: 400 },
    );
  }
  if (!isQuota(payload.quota)) {
    return NextResponse.json(
      { error: "invalid_quota", message: "Kuota harus 4, 8, 16, atau 32." },
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

  const name = (payload.name as string).trim();
  const quota = payload.quota;

  const incomingToken = readGuestToken(request);
  if (incomingToken) {
    const existing = await prisma.guestSession.findUnique({
      where: {
        eventId_anonymousTokenHash: {
          eventId: event.id,
          anonymousTokenHash: guestTokenHash(incomingToken),
        },
      },
      select: {
        id: true,
        name: true,
        quota: true,
        status: true,
        createdAt: true,
      },
    });
    if (existing) {
      return NextResponse.json({ session: existing, event });
    }
  }

  const token = incomingToken ?? createGuestToken();
  const anonymousTokenHash = guestTokenHash(token);

  let session;
  try {
    session = await prisma.guestSession.create({
      data: {
        eventId: event.id,
        anonymousTokenHash,
        name,
        quota,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        quota: true,
        status: true,
        createdAt: true,
      },
    });
  } catch {
    const existing = await prisma.guestSession.findUnique({
      where: {
        eventId_anonymousTokenHash: { eventId: event.id, anonymousTokenHash },
      },
      select: {
        id: true,
        name: true,
        quota: true,
        status: true,
        createdAt: true,
      },
    });
    if (!existing) throw new Error("Gagal membuat sesi tamu");
    session = existing;
  }

  await writeAuditLog({
    actorType: "guest",
    actorId: session.id,
    action: "session.create",
    targetType: "guest_session",
    targetId: session.id,
    metadata: { eventId: event.id, quota },
  });

  const response = NextResponse.json({ session, event });
  if (!incomingToken) {
    response.headers.append("Set-Cookie", buildGuestCookie(token));
  }
  return response;
}