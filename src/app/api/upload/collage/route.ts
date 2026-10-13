import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuestGuardFailure, requireGuestSession } from "@/lib/guest-guard";
import { reserveCollage } from "@/lib/collage-quota";
import { uploadCollageToGas } from "@/lib/gas";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  MAX_COLLAGE_BYTES,
  isAllowedCollageMimeType,
  isQuota,
} from "@/lib/config";
import { readImageDimensions } from "@/lib/image";

const MAX_BYTES = MAX_COLLAGE_BYTES;

function exportCollage(collage: {
  id: string;
  status: string;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  photoCount: number | null;
  uploadedAt: Date | null;
}) {
  return {
    id: collage.id,
    status: collage.status,
    mimeType: collage.mimeType,
    byteSize: collage.byteSize,
    width: collage.width,
    height: collage.height,
    photoCount: collage.photoCount,
    uploadedAt: collage.uploadedAt,
  };
}

export async function POST(request: Request) {
  const limited = rateLimit(`collage-gas:${clientIp(request)}`, 20, 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfter);

  const guard = await requireGuestSession(request);
  if (isGuestGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_form", message: "FormData tidak valid." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "file_required", message: "File kolase wajib diunggah." },
      { status: 400 },
    );
  }
  const mimeType = file.type;
  if (!isAllowedCollageMimeType(mimeType)) {
    return NextResponse.json(
      {
        error: "invalid_mime",
        message: "Kolase harus berupa JPEG atau PNG.",
      },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { error: "empty_file", message: "File kolase kosong." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: "file_too_large",
        message: `Ukuran maksimal ${Math.round(MAX_BYTES / (1024 * 1024))}MB.`,
      },
      { status: 413 },
    );
  }

  const photoCount = Number(form.get("photoCount"));
  if (!isQuota(photoCount)) {
    return NextResponse.json(
      {
        error: "invalid_photo_count",
        message: "Jumlah foto tidak valid (4, 8, 16, atau 32).",
      },
      { status: 400 },
    );
  }

  const sessionRow = await prisma.guestSession.findUnique({
    where: { id: guard.session.id },
    select: { quota: true },
  });
  if (!sessionRow) {
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }
  if (photoCount > sessionRow.quota) {
    return NextResponse.json(
      { error: "quota_exceeded", message: "Jumlah foto melebihi kuota sesi." },
      { status: 409 },
    );
  }

  const rawKey = form.get("idempotencyKey");
  const idempotencyKey =
    typeof rawKey === "string" && rawKey.length >= 8 && rawKey.length <= 128
      ? rawKey
      : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const dimensions = readImageDimensions(buffer);
  if (!dimensions) {
    return NextResponse.json(
      { error: "invalid_image", message: "Gambar kolase tidak valid." },
      { status: 422 },
    );
  }

  const existing = await prisma.collage.findUnique({
    where: { sessionId: guard.session.id },
    select: {
      id: true,
      status: true,
      idempotencyKey: true,
      mimeType: true,
      byteSize: true,
      width: true,
      height: true,
      photoCount: true,
      uploadedAt: true,
    },
  });
  if (
    existing &&
    existing.status === "UPLOADED" &&
    existing.idempotencyKey === idempotencyKey
  ) {
    return NextResponse.json({
      collage: exportCollage(existing),
      reused: true,
    });
  }

  const reserved = await reserveCollage({
    sessionId: guard.session.id,
    eventId: guard.event.id,
    idempotencyKey,
  });
  if (!reserved.ok) {
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }

  const fileName = `vanry-collage-${guard.session.id}.${
    mimeType === "image/png" ? "png" : "jpg"
  }`;

  try {
    const gas = await uploadCollageToGas({
      fileName,
      mimeType,
      base64: buffer.toString("base64"),
    });
    if (!gas.success) {
      throw new Error(gas.message || "GAS menolak unggahan kolase.");
    }

    const saved = await prisma.collage.update({
      where: { id: reserved.collage.id },
      data: {
        status: "UPLOADED",
        photoCount,
        mimeType,
        byteSize: buffer.byteLength,
        width: dimensions.width,
        height: dimensions.height,
        driveFileUrl: gas.fileUrl ?? gas.folderUrl,
        driveFileId: gas.fileId,
        driveFileName: gas.fileNameFoto ?? fileName,
        uploadedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        mimeType: true,
        byteSize: true,
        width: true,
        height: true,
        photoCount: true,
        uploadedAt: true,
      },
    });

    await writeAuditLog({
      actorType: "guest",
      actorId: guard.session.id,
      action: "collage.upload",
      targetType: "collage",
      targetId: saved.id,
      metadata: {
        eventId: guard.event.id,
        photoCount,
        byteSize: buffer.byteLength,
      },
    });

    return NextResponse.json({ collage: saved, reused: false });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown_error";
    if (process.env.NODE_ENV !== "production") {
      console.error("[upload/collage] gagal mengunggah kolase:", detail);
    }
    await prisma.collage.update({
      where: { id: reserved.collage.id },
      data: { status: "FAILED" },
    });
    await writeAuditLog({
      actorType: "guest",
      actorId: guard.session.id,
      action: "collage.upload.failed",
      targetType: "collage",
      targetId: reserved.collage.id,
      metadata: { eventId: guard.event.id, reason: "gas" },
    });
    return NextResponse.json(
      {
        error: "upload_failed",
        message: "Gagal mengunggah kolase ke Google Drive. Coba lagi.",
      },
      { status: 502 },
    );
  }
}