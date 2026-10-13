import { prisma } from "@/lib/prisma";

export type ReservePhotoResult =
  | {
      ok: true;
      reused: boolean;
      photo: { id: string; index: number; status: string };
      used: number;
      quota: number;
    }
  | { ok: false; reason: "quota_exceeded" }
  | { ok: false; reason: "session_not_found" };

export async function reservePhoto(params: {
  sessionId: string;
  eventId: string;
  idempotencyKey: string;
}): Promise<ReservePhotoResult> {
  const { sessionId, eventId, idempotencyKey } = params;

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; quota: number }>>`
      SELECT id, quota FROM guest_sessions WHERE id = ${sessionId} FOR UPDATE
    `;

    if (rows.length === 0) {
      return { ok: false, reason: "session_not_found" } as const;
    }
    const quota = Number(rows[0]!.quota);

    const existing = await tx.photo.findUnique({
      where: {
        sessionId_idempotencyKey: { sessionId, idempotencyKey },
      },
      select: { id: true, index: true, status: true },
    });
    if (existing) {
      const used = await tx.photo.count({
        where: { sessionId, status: { in: ["RESERVED", "UPLOADED"] } },
      });
      return {
        ok: true,
        reused: true,
        photo: existing,
        used,
        quota,
      } as const;
    }

    const used = await tx.photo.count({
      where: { sessionId, status: { in: ["RESERVED", "UPLOADED"] } },
    });

    if (used >= quota) {
      return { ok: false, reason: "quota_exceeded" } as const;
    }

    const photo = await tx.photo.create({
      data: {
        sessionId,
        eventId,
        index: used + 1,
        idempotencyKey,
        status: "RESERVED",
      },
      select: { id: true, index: true, status: true },
    });

    return {
      ok: true,
      reused: false,
      photo,
      used: used + 1,
      quota,
    } as const;
  });
}