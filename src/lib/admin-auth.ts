import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_SESSION_TTL_SECONDS } from "@/lib/config";
import { signValue, verifySignedValue } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
};

type AdminPayload = { userId: string; exp: number };

export function createAdminCookie(userId: string): string {
  const payload: AdminPayload = {
    userId,
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const { signature } = signValue(encoded);
  const value = encodeURIComponent(`${encoded}:${signature}`);
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function decodeAdminToken(raw: string): AdminPayload | null {
  const [encoded, signature] = raw.split(":");
  if (!encoded || !signature) return null;
  if (!verifySignedValue(encoded, signature)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as AdminPayload;
    if (!payload.userId || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function readAdminCookieValue(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const entry = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`));
  if (!entry) return null;
  return decodeURIComponent(entry.slice(ADMIN_COOKIE.length + 1));
}

export async function getAdminUserId(
  request: Request,
): Promise<string | null> {
  const raw = readAdminCookieValue(request);
  if (raw) {
    const payload = decodeAdminToken(raw);
    return payload?.userId ?? null;
  }

  const store = await cookies();
  const cookieValue = store.get(ADMIN_COOKIE)?.value;
  if (!cookieValue) return null;
  return decodeAdminToken(cookieValue)?.userId ?? null;
}

export async function getAdminUser(request: Request): Promise<AdminUser | null> {
  const userId = await getAdminUserId(request);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  return user;
}

export async function getAdminUserFromCookies(): Promise<AdminUser | null> {
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  if (!raw) return null;
  const payload = decodeAdminToken(raw);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true },
  });
}

export async function getAdminOrganizationIds(
  request: Request,
): Promise<{ user: AdminUser; organizationIds: string[] } | null> {
  const user = await getAdminUser(request);
  if (!user) return null;
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });
  if (memberships.length === 0) return null;
  return {
    user,
    organizationIds: memberships.map((m) => m.organizationId),
  };
}