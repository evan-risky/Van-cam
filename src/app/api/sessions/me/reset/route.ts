import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventBySlug } from "@/lib/event";
import {
  clearGuestCookie,
  getGuestToken,
  guestTokenHash,
} from "@/lib/guest-session";
import { DEFAULT_EVENT_SLUG } from "@/lib/config";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(`reset:${clientIp(request)}`, 20, 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfter);

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? DEFAULT_EVENT_SLUG;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json(
      { error: "event_not_found", message: "Acara tidak ditemukan." },
      { status: 404 },
    );
  }

  const token = await getGuestToken();
  if (token) {
    const session = await prisma.guestSession.findUnique({
      where: {
        eventId_anonymousTokenHash: {
          eventId: event.id,
          anonymousTokenHash: guestTokenHash(token),
        },
      },
      select: { id: true, status: true },
    });

    if (session && session.status === "ACTIVE") {
      await prisma.guestSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    if (session) {
      await writeAuditLog({
        actorType: "guest",
        actorId: session.id,
        action: "session.reset",
        targetType: "guest_session",
        targetId: session.id,
        metadata: { eventId: event.id },
      });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearGuestCookie());
  return response;
}
