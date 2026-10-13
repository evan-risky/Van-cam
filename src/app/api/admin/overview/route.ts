import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardFailure, requireAdminEvent } from "@/lib/admin-guard";

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
  const { event } = guard;

  const [
    sessionCount,
    quotaAggregate,
    uploadedCount,
    reservedCount,
    failedCount,
    recentSessions,
    recentAudit,
  ] = await Promise.all([
    prisma.guestSession.count({ where: { eventId: event.id } }),
    prisma.guestSession.aggregate({
      where: { eventId: event.id },
      _sum: { quota: true },
    }),
    prisma.photo.count({ where: { eventId: event.id, status: "UPLOADED" } }),
    prisma.photo.count({ where: { eventId: event.id, status: "RESERVED" } }),
    prisma.photo.count({ where: { eventId: event.id, status: "FAILED" } }),
    prisma.guestSession.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        quota: true,
        status: true,
        createdAt: true,
        photos: { select: { status: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: { organizationId: event.organizationId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        actorType: true,
        targetType: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    event,
    stats: {
      sessionCount,
      quotaTotal: quotaAggregate._sum.quota ?? 0,
      uploadedCount,
      reservedCount,
      failedCount,
    },
    recentSessions: recentSessions.map((session) => ({
      id: session.id,
      name: session.name,
      quota: session.quota,
      status: session.status,
      createdAt: session.createdAt,
      uploadedCount: session.photos.filter((p) => p.status === "UPLOADED")
        .length,
    })),
    recentAudit,
  });
}