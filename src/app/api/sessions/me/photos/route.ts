import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventBySlug } from "@/lib/event";
import { getGuestToken, guestTokenHash } from "@/lib/guest-session";
import { DEFAULT_EVENT_SLUG } from "@/lib/config";

export async function GET(request: Request) {
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
    select: {
      id: true,
      name: true,
      quota: true,
      status: true,
      photos: {
        where: { status: "UPLOADED" },
        orderBy: { index: "asc" },
        select: { id: true, index: true, uploadedAt: true, mimeType: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    event,
    session: {
      id: session.id,
      name: session.name,
      quota: session.quota,
      status: session.status,
    },
    photos: session.photos.map((photo) => ({
      id: photo.id,
      index: photo.index,
      uploadedAt: photo.uploadedAt,
    })),
  });
}