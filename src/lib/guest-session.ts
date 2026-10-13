import { cookies } from "next/headers";
import { GUEST_COOKIE, GUEST_SESSION_TTL_SECONDS } from "@/lib/config";
import { hashToken, randomToken } from "@/lib/crypto";

export function createGuestToken(): string {
  return randomToken(32);
}

export function guestTokenHash(token: string): string {
  return hashToken(token);
}

export function buildGuestCookie(token: string): string {
  return `${GUEST_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GUEST_SESSION_TTL_SECONDS}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

function parseCookieHeader(header: string | null): string | null {
  if (!header) return null;
  const entry = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GUEST_COOKIE}=`));
  if (!entry) return null;
  return decodeURIComponent(entry.slice(GUEST_COOKIE.length + 1));
}

export function readGuestToken(request: Request): string | null {
  return parseCookieHeader(request.headers.get("cookie"));
}

export async function getGuestToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(GUEST_COOKIE)?.value;
  return value ?? null;
}