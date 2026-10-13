import "server-only";
import { getGasWebAppUrl } from "@/lib/config";

export type GasUploadResult = {
  success: boolean;
  message: string;
  folderUrl: string | null;
  fileUrl: string | null;
  fileId: string | null;
  fileNameFoto: string | null;
};

export function isGasConfigured(): boolean {
  return getGasWebAppUrl() !== null;
}

export async function uploadCollageToGas(input: {
  fileName: string;
  mimeType: string;
  base64: string;
}): Promise<GasUploadResult> {
  const url = getGasWebAppUrl();
  if (!url) throw new Error("GAS_WEB_APP_URL belum diatur");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      fileName: input.fileName,
      mimeType: input.mimeType,
      base64: input.base64,
    }),
    redirect: "follow",
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GAS merespons ${response.status}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Respons GAS bukan JSON yang valid");
  }

  const record = (parsed ?? {}) as Record<string, unknown>;
  const pick = (keys: string[]): string | null => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
    return null;
  };

  return {
    success: record.success === true,
    message: typeof record.message === "string" ? record.message : "",
    folderUrl: pick(["folderUrl", "folder_url"]),
    fileUrl: pick(["fileUrl", "file_url", "driveFileUrl", "downloadUrl"]),
    fileId: pick(["driveFileId", "fileId", "file_id", "id"]),
    fileNameFoto: pick(["fileNameFoto", "fileName", "file_name"]),
  };
}