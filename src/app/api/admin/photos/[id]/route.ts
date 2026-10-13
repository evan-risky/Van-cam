import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuardFailure, requireAdminEvent } from "@/lib/admin-guard";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: photoId } = await context.params;
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  const guard = await requireAdminEvent(request, slug);
  if (isGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      eventId: guard.event.id,
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

  const headers = new Headers();
  headers.set("Content-Type", photo.mimeType ?? "image/jpeg");
  headers.set("Cache-Control", "private, no-store");
  const bytes = new Uint8Array(photo.fileData);
  headers.set("Content-Length", String(bytes.byteLength));
  return new NextResponse(bytes, { status: 200, headers });
}
