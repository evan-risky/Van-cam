export const GUEST_COOKIE = "vanry_guest";
export const ADMIN_COOKIE = "vanry_admin";

export const QUOTA_OPTIONS = [4, 8, 16, 32] as const;
export type Quota = (typeof QUOTA_OPTIONS)[number];
export const DEFAULT_QUOTA: Quota = 8;

export const GUEST_NAME_MIN = 2;
export const GUEST_NAME_MAX = 60;

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const CLIENT_PHOTO_TARGET_BYTES = 3 * 1024 * 1024;
export const MIN_PHOTO_DIMENSION = 16;
export const MAX_PHOTO_DIMENSION = 8000;
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const GUEST_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export const DEFAULT_EVENT_SLUG = "evan-inri";

export const COLLAGE_MIME_TYPE = "image/jpeg";
export const COLLAGE_MIME_TYPES = ["image/jpeg", "image/png"] as const;
export const MAX_COLLAGE_BYTES = 25 * 1024 * 1024;

export function isAllowedCollageMimeType(value: string): boolean {
  return (COLLAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function getGasWebAppUrl(
  value: string | undefined = process.env.GAS_WEB_APP_URL,
): string | null {
  return value && value.length > 0 ? value : null;
}

export function isQuota(value: unknown): value is Quota {
  return (
    typeof value === "number" &&
    (QUOTA_OPTIONS as readonly number[]).includes(value)
  );
}

export function isValidGuestName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length >= GUEST_NAME_MIN && trimmed.length <= GUEST_NAME_MAX;
}

export function isAllowedMimeType(value: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}