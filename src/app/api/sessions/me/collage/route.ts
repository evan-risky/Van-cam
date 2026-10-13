import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGuestGuardFailure, requireGuestSession } from "@/lib/guest-guard";

export async function GET(request: Request) {
  const guard = await requireGuestSession(request);
  if (isGuestGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const collage = await prisma.collage.findUnique({
    where: { sessionId: guard.session.id },
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

  return NextResponse.json({ collage: collage ?? null });
}
