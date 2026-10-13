import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuestGuardFailure, requireGuestSession } from "@/lib/guest-guard";

type CollageFile = {
  id: string;
  mimeType: string | null;
  driveFileUrl: string | null;
  driveFileId: string | null;
  driveFileName: string | null;
};

function driveCandidates(collage: CollageFile): string[] {
  const urls: string[] = [];
  if (collage.driveFileId) {
    const id = encodeURIComponent(collage.driveFileId);
    urls.push(`https://drive.google.com/thumbnail?id=${id}&sz=w2000`);
    urls.push(`https://lh3.googleusercontent.com/d/${id}`);
    urls.push(`https://drive.google.com/uc?export=download&id=${id}`);
  }
  if (collage.driveFileUrl) urls.push(collage.driveFileUrl);
  return urls;
}

async function loadDriveImage(
  collage: CollageFile,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  for (const url of driveCandidates(collage)) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        cache: "no-store",
      });
      if (!response.ok || !response.body) continue;
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;
      return { body: response.body, contentType };
    } catch {
      continue;
    }
  }
  return null;
}

export async function buildCollageResponse(
  request: Request,
  collageId: string,
  disposition: "inline" | "attachment",
): Promise<NextResponse> {
  const guard = await requireGuestSession(request);
  if (isGuestGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const collage = await prisma.collage.findFirst({
    where: {
      id: collageId,
      sessionId: guard.session.id,
      eventId: guard.event.id,
      status: "UPLOADED",
    },
    select: {
      id: true,
      mimeType: true,
      driveFileUrl: true,
      driveFileId: true,
      driveFileName: true,
    },
  });
  if (!collage) {
    return NextResponse.json(
      { error: "not_found", message: "Kolase tidak ditemukan." },
      { status: 404 },
    );
  }

  const file = await loadDriveImage(collage);
  if (!file) {
    return NextResponse.json(
      { error: "storage_unavailable", message: "Kolase tidak dapat diambil." },
      { status: 502 },
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", collage.mimeType ?? file.contentType);
  headers.set("Cache-Control", "private, no-store");
  headers.set(
    "Content-Disposition",
    disposition === "inline"
      ? "inline"
      : `attachment; filename="${collage.driveFileName ?? `vanry-cam-kolase-${collage.id}.jpg`}"`,
  );

  return new NextResponse(file.body, { status: 200, headers });
}