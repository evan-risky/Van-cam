import "server-only";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EVENT_SLUG } from "@/lib/config";
import { getEventBySlug } from "@/lib/event";
import { getGuestToken, guestTokenHash } from "@/lib/guest-session";

export type GuestContext = {
  event: { id: string; slug: string; organizationId: string };
  session: { id: string };
};

export type GuestGuardFailure = {
  status: number;
  error: string;
  message: string;
};

export async function requireGuestSession(
  request: Request,
): Promise<GuestContext | GuestGuardFailure> {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? DEFAULT_EVENT_SLUG;
  const event = await getEventBySlug(slug);
  if (!event) {
    return {
      status: 404,
      error: "event_not_found",
      message: "Acara tidak ditemukan.",
    };
  }

  const token = await getGuestToken();
  if (!token) {
    return {
      status: 401,
      error: "no_session",
      message: "Sesi tamu tidak ditemukan.",
    };
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
    return {
      status: 401,
      error: "no_session",
      message: "Sesi tamu tidak ditemukan.",
    };
  }

  const organizationId = await prisma.event.findUnique({
    where: { id: event.id },
    select: { organizationId: true },
  });

  return {
    event: {
      id: event.id,
      slug: event.slug,
      organizationId: organizationId?.organizationId ?? "",
    },
    session: { id: session.id },
  };
}

export function isGuestGuardFailure(
  value: GuestContext | GuestGuardFailure,
): value is GuestGuardFailure {
  return "status" in value;
}
