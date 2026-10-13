import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/crypto";
import { createAdminCookie } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limited = rateLimit(`admin-login:${clientIp(request)}`, 10, 60 * 1000);
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

  const payload = (body ?? {}) as { email?: unknown; password?: unknown };
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password =
    typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "invalid_credentials", message: "Email dan kata sandi wajib." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    await writeAuditLog({
      actorType: "system",
      action: "admin.login.failed",
      metadata: { email },
    });
    return NextResponse.json(
      { error: "invalid_credentials", message: "Email atau kata sandi salah." },
      { status: 401 },
    );
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  if (!membership) {
    return NextResponse.json(
      {
        error: "no_membership",
        message: "Akun ini tidak terhubung ke organisasi mana pun.",
      },
      { status: 403 },
    );
  }

  await writeAuditLog({
    organizationId: membership.organizationId,
    actorType: "admin",
    actorId: user.id,
    action: "admin.login",
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
  response.headers.append("Set-Cookie", createAdminCookie(user.id));
  return response;
}