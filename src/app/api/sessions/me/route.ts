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
    return NextResponse.json({ session: null, event });
  }

  const session = await prisma.guestSession.findUnique({
    where: {
      eventId_anonymousTokenHash: {
        eventId: event.id,
        anonymousTokenHash: guestTokenHash(token),
      },
    },
    include: {
      photos: {
        orderBy: { index: "asc" },
        select: {
          id: true,
          index: true,
          status: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ session: null, event });
  }

  const uploadedCount = session.photos.filter(
    (photo) => photo.status === "UPLOADED",
  ).length;
  const reservedCount = session.photos.filter(
    (photo) => photo.status === "RESERVED",
  ).length;

  return NextResponse.json({
    session: {
      id: session.id,
      name: session.name,
      quota: session.quota,
      status: session.status,
      uploadedCount,
      reservedCount,
      photos: session.photos,
    },
    event,
  });
}