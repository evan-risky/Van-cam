import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardFailure, requireAdminEvent } from "@/lib/admin-guard";

const VALID_STATUS = new Set(["RESERVED", "UPLOADED", "FAILED"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const statusParam = url.searchParams.get("status");
  const status =
    statusParam && VALID_STATUS.has(statusParam) ? statusParam : undefined;

  const guard = await requireAdminEvent(request, slug);
  if (isGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const photos = await prisma.photo.findMany({
    where: {
      eventId: guard.event.id,
      ...(status ? { status: status as "RESERVED" | "UPLOADED" | "FAILED" } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      index: true,
      status: true,
      mimeType: true,
      byteSize: true,
      uploadedAt: true,
      createdAt: true,
      session: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    photos: photos.map((photo) => ({
      id: photo.id,
      index: photo.index,
      status: photo.status,
      mimeType: photo.mimeType,
      byteSize: photo.byteSize,
      uploadedAt: photo.uploadedAt,
      createdAt: photo.createdAt,
      sessionId: photo.session.id,
      sessionName: photo.session.name,
    })),
  });
}