import { NextResponse } from "next/server";
import { isGuestGuardFailure, requireGuestSession } from "@/lib/guest-guard";
import { reserveCollage } from "@/lib/collage-quota";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(`collage:${clientIp(request)}`, 30, 60 * 1000);
  if (!limited.ok) return rateLimitResponse(limited.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Body tidak valid." },
      { status: 400 },
    );
  }

  const payload = (body ?? {}) as { idempotencyKey?: unknown };
  const idempotencyKey = payload.idempotencyKey;
  if (
    typeof idempotencyKey !== "string" ||
    idempotencyKey.length < 8 ||
    idempotencyKey.length > 128
  ) {
    return NextResponse.json(
      {
        error: "invalid_idempotency_key",
        message: "idempotencyKey harus 8–128 karakter.",
      },
      { status: 400 },
    );
  }

  const guard = await requireGuestSession(request);
  if (isGuestGuardFailure(guard)) {
    return NextResponse.json(
      { error: guard.error, message: guard.message },
      { status: guard.status },
    );
  }

  const result = await reserveCollage({
    sessionId: guard.session.id,
    eventId: guard.event.id,
    idempotencyKey,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "no_session", message: "Sesi tamu tidak ditemukan." },
      { status: 401 },
    );
  }

  await writeAuditLog({
    actorType: "guest",
    actorId: guard.session.id,
    action: result.reused ? "collage.reserve.reused" : "collage.reserve",
    targetType: "collage",
    targetId: result.collage.id,
    metadata: { eventId: guard.event.id },
  });

  return NextResponse.json({ collage: result.collage });
}