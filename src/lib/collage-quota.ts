import "server-only";
import { prisma } from "@/lib/prisma";

export type ReserveCollageResult =
  | {
      ok: true;
      reused: boolean;
      collage: { id: string; status: string };
    }
  | { ok: false; reason: "session_not_found" };

export async function reserveCollage(params: {
  sessionId: string;
  eventId: string;
  idempotencyKey: string;
}): Promise<ReserveCollageResult> {
  const { sessionId, eventId, idempotencyKey } = params;

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM guest_sessions WHERE id = ${sessionId} FOR UPDATE
    `;
    if (rows.length === 0) {
      return { ok: false, reason: "session_not_found" } as const;
    }

    const existing = await tx.collage.findUnique({
      where: { sessionId },
      select: { id: true, status: true, idempotencyKey: true },
    });

    if (existing) {
      if (existing.idempotencyKey === idempotencyKey) {
        return {
          ok: true,
          reused: true,
          collage: { id: existing.id, status: existing.status },
        } as const;
      }
      const replaced = await tx.collage.update({
        where: { id: existing.id },
        data: {
          idempotencyKey,
          status: "RESERVED",
          photoCount: null,
          mimeType: null,
          byteSize: null,
          width: null,
          height: null,
          driveFileUrl: null,
          driveFileName: null,
          uploadedAt: null,
        },
        select: { id: true, status: true },
      });
      return { ok: true, reused: false, collage: replaced } as const;
    }

    const collage = await tx.collage.create({
      data: {
        sessionId,
        eventId,
        idempotencyKey,
        status: "RESERVED",
      },
      select: { id: true, status: true },
    });

    return { ok: true, reused: false, collage } as const;
  });
}
