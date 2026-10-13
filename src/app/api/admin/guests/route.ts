import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardFailure, requireAdminEvent } from "@/lib/admin-guard";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const search = (url.searchParams.get("search") ?? "").trim();

  const guard = await requireAdminEvent(request, slug);
  if (isGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const sessions = await prisma.guestSession.findMany({
    where: {
      eventId: guard.event.id,
      ...(search
        ? { name: { contains: search } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      quota: true,
      status: true,
      createdAt: true,
      completedAt: true,
      photos: { select: { status: true } },
    },
  });

  return NextResponse.json({
    guests: sessions.map((session) => ({
      id: session.id,
      name: session.name,
      quota: session.quota,
      status: session.status,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
      uploadedCount: session.photos.filter((p) => p.status === "UPLOADED")
        .length,
      reservedCount: session.photos.filter((p) => p.status === "RESERVED")
        .length,
      failedCount: session.photos.filter((p) => p.status === "FAILED").length,
    })),
  });
}