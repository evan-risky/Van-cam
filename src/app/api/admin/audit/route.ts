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

  const logs = await prisma.auditLog.findMany({
    where: { organizationId: guard.event.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      actorType: true,
      actorId: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ logs });
}