import { CLIENT_PHOTO_TARGET_BYTES } from "@/lib/config";

export type CapturedPhoto = {
  blob: Blob;
  mimeType: string;
};

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal memproses foto"));
      },
      "image/jpeg",
      quality,
    );
  });
}

export async function captureFrame(
  video: HTMLVideoElement,
): Promise<CapturedPhoto> {
  const sourceWidth = video.videoWidth || 720;
  const sourceHeight = video.videoHeight || 960;
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia");
  context.drawImage(video, 0, 0, width, height);

  for (let quality = 0.85; quality >= 0.4; quality -= 0.1) {
    const blob = await toJpeg(canvas, quality);
    if (blob.size <= CLIENT_PHOTO_TARGET_BYTES) {
      return { blob, mimeType: "image/jpeg" };
    }
  }

  const fallback = await toJpeg(canvas, 0.4);
  return { blob: fallback, mimeType: "image/jpeg" };
}