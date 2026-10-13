import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEventBySlug } from "@/lib/event";
import { getGuestToken, guestTokenHash } from "@/lib/guest-session";
import {
  ALLOWED_MIME_TYPES,
  DEFAULT_EVENT_SLUG,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_DIMENSION,
  isAllowedMimeType,
} from "@/lib/config";
import { isAcceptableDimensions, readImageDimensions } from "@/lib/image";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const limited = rateLimit(`upload:${clientIp(request)}`, 40, 60 * 1000);
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
    where: { id: photoId, sessionId: session.id, eventId: event.id },
    select: {
      id: true,
      index: true,
      status: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      uploadedAt: true,
    },
  });
  if (!photo) {
    return NextResponse.json(
      { error: "not_found", message: "Jepretan tidak ditemukan." },
      { status: 404 },
    );
  }

  if (photo.status === "UPLOADED") {
    return NextResponse.json({
      photo: {
        id: photo.id,
        index: photo.index,
        status: photo.status,
        mimeType: photo.mimeType,
        byteSize: photo.byteSize,
        width: photo.width,
        height: photo.height,
      },
      reused: true,
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const mimeType = contentType.split(";")[0]?.trim() ?? "";
  if (!isAllowedMimeType(mimeType)) {
    return NextResponse.json(
      {
        error: "invalid_mime",
        message: `Tipe file harus salah satu dari ${ALLOWED_MIME_TYPES.join(", ")}.`,
      },
      { status: 415 },
    );
  }

  const buffer = Buffer.from(await request.arrayBuffer());
  if (buffer.byteLength === 0) {
    return NextResponse.json(
      { error: "empty_file", message: "File kosong." },
      { status: 400 },
    );
  }
  if (buffer.byteLength > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      {
        error: "file_too_large",
        message: `Ukuran maksimal ${MAX_PHOTO_BYTES / (1024 * 1024)}MB.`,
      },
      { status: 413 },
    );
  }

  const dimensions = readImageDimensions(buffer);
  if (!dimensions || !isAcceptableDimensions(dimensions)) {
    return NextResponse.json(
      {
        error: "invalid_image",
        message: `Gambar tidak valid atau dimensinya di luar batas (maksimal ${MAX_PHOTO_DIMENSION}px).`,
      },
      { status: 422 },
    );
  }

  try {
    const saved = await prisma.photo.update({
      where: { id: photo.id },
      data: {
        fileData: buffer,
        mimeType,
        byteSize: buffer.byteLength,
        width: dimensions.width,
        height: dimensions.height,
        uploadedAt: new Date(),
        status: "UPLOADED",
      },
      select: {
        id: true,
        index: true,
        status: true,
        mimeType: true,
        byteSize: true,
        width: true,
        height: true,
        uploadedAt: true,
      },
    });

    await writeAuditLog({
      actorType: "guest",
      actorId: session.id,
      action: "photo.upload",
      targetType: "photo",
      targetId: photo.id,
      metadata: { eventId: event.id, byteSize: buffer.byteLength },
    });

    return NextResponse.json({ photo: saved, reused: false });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown_error";
    if (process.env.NODE_ENV !== "production") {
      console.error("[upload] gagal menyimpan foto ke MySQL:", detail);
    }
    await prisma.photo.update({
      where: { id: photo.id },
      data: { status: "FAILED" },
    });
    await writeAuditLog({
      actorType: "guest",
      actorId: session.id,
      action: "photo.upload.failed",
      targetType: "photo",
      targetId: photo.id,
      metadata: { eventId: event.id, reason: "storage" },
    });
    return NextResponse.json(
      {
        error: "upload_failed",
        message: "Gagal menyimpan foto ke penyimpanan. Coba lagi.",
      },
      { status: 502 },
    );
  }
}