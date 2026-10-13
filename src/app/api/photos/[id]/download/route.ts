import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventBySlug } from "@/lib/event";
import { getGuestToken, guestTokenHash } from "@/lib/guest-session";
import { DEFAULT_EVENT_SLUG } from "@/lib/config";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(`download:${clientIp(request)}`, 120, 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfter);

  const { id: photoId } = await context.params;

  const token = await getGuestToken();
  if (!token) {
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? DEFAULT_EVENT_SLUG;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json(
      { error: "event_not_found", message: "Acara tidak ditemukan." },
      { status: 404 },
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

  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      sessionId: session.id,
      eventId: event.id,
      status: "UPLOADED",
    },
    select: { id: true, index: true, fileData: true, mimeType: true },
  });
  if (!photo || !photo.fileData) {
    return NextResponse.json(
      { error: "not_found", message: "Foto tidak ditemukan." },
      { status: 404 },
    );
  }

  await writeAuditLog({
    actorType: "guest",
    actorId: session.id,
    action: "photo.download",
    targetType: "photo",
    targetId: photo.id,
    metadata: { eventId: event.id },
  });

  const headers = new Headers();
  headers.set("Content-Type", photo.mimeType ?? "image/jpeg");
  headers.set("Cache-Control", "private, no-store");
  const inline = url.searchParams.get("inline") === "1";
  headers.set(
    "Content-Disposition",
    inline
      ? "inline"
      : `attachment; filename="vanry-cam-${photo.index}.jpg"`,
  );

  const bytes = new Uint8Array(photo.fileData);
  headers.set("Content-Length", String(bytes.byteLength));
  return new NextResponse(bytes, { status: 200, headers });
}
