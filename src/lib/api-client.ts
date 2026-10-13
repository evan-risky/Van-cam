export type GuestSessionView = {
  id: string;
  name: string;
  quota: number;
  status: string;
  uploadedCount: number;
  reservedCount: number;
};

export type MyPhoto = {
  id: string;
  index: number;
  uploadedAt: string | null;
};

export type MyCollage = {
  id: string;
  status: string;
  mimeType: string | null;
  byteSize: number | null;
  width: number | null;
  height: number | null;
  photoCount: number | null;
  uploadedAt: string | null;
};

export type EventView = {
  id: string;
  name: string;
  slug: string;
  couple: string;
  location: string;
  dateLabel: string;
  year: number;
};

export type OverviewStats = {
  sessionCount: number;
  quotaTotal: number;
  uploadedCount: number;
  reservedCount: number;
  failedCount: number;
};

export type OverviewSession = {
  id: string;
  name: string;
  quota: number;
  status: string;
  createdAt: string;
  uploadedCount: number;
};

export type AuditEntry = {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown;
  createdAt: string;
};

export type AdminGuest = {
  id: string;
  name: string;
  quota: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  uploadedCount: number;
  reservedCount: number;
  failedCount: number;
};

export type AdminPhoto = {
  id: string;
  index: number;
  status: string;
  mimeType: string | null;
  byteSize: number | null;
  uploadedAt: string | null;
  createdAt: string;
  sessionId: string;
  sessionName: string;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function handle<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text.slice(0, 200) };
    }
  }
  if (!response.ok) {
    const record = data as { error?: string; message?: string };
    throw new ApiError(
      response.status,
      record.error ?? "error",
      record.message ?? "Terjadi kesalahan.",
    );
  }
  return data as T;
}

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  return handle<T>(response);
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handle<T>(response);
}

export async function apiUpload<T>(
  url: string,
  blob: Blob,
  contentType: string,
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  return handle<T>(response);
}

export async function apiUploadForm<T>(
  url: string,
  form: FormData,
): Promise<T> {
  const response = await fetch(url, { method: "POST", body: form });
  return handle<T>(response);
}

export function photoInlineUrl(photoId: string): string {
  return `/api/photos/${photoId}/download?inline=1`;
}

export function collageImageUrl(collageId: string): string {
  return `/api/collage/${collageId}/image`;
}

export function collagePreviewUrl(collageId: string): string {
  return collageImageUrl(collageId);
}

export function collageDownloadUrl(collageId: string): string {
  return `/api/collages/${collageId}/download`;
}