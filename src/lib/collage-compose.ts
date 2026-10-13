"use client";

import { COLLAGE_MIME_TYPE, MAX_COLLAGE_BYTES } from "@/lib/config";
import {
  collageGridLayout,
  POSTER_COLORS,
  POSTER_TYPOGRAPHY,
} from "@/lib/collage-style";

export { collageGrid } from "@/lib/collage-style";

export type CollageComposeInput = {
  blobs: Blob[];
  couple?: string;
  guest?: string;
  dateLabel?: string;
};

const FRAME_WIDTH = 1080;
const MARGIN = 48;
const GAP = 16;
const HEADER_HEIGHT = 190;
const FOOTER_HEIGHT = 160;

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal memuat foto"));
    };
    image.src = url;
  });
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal membuat kolase"));
      },
      COLLAGE_MIME_TYPE,
      quality,
    );
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = x + (width - drawWidth) / 2;
  const offsetY = y + (height - drawHeight) / 2;
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

function drawStamp(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
) {
  const radius = 62;
  context.save();
  context.translate(centerX, centerY);
  context.rotate((-12 * Math.PI) / 180);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.strokeStyle = POSTER_COLORS.accent;
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = POSTER_COLORS.accent;
  context.font = `600 20px ${POSTER_TYPOGRAPHY.meta}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("VANRY", 0, -8);
  context.fillText("CAM", 0, 16);
  context.restore();
}

export async function composeCollage(
  input: CollageComposeInput,
): Promise<Blob> {
  const images = await Promise.all(input.blobs.map(loadImage));
  const { columns, rows } = collageGridLayout(images.length);

  const tileSize =
    (FRAME_WIDTH - MARGIN * 2 - GAP * (columns - 1)) / columns;
  const gridHeight = rows * tileSize + GAP * (rows - 1);
  const frameHeight = MARGIN * 2 + HEADER_HEIGHT + gridHeight + FOOTER_HEIGHT;

  const canvas = document.createElement("canvas");
  canvas.width = FRAME_WIDTH;
  canvas.height = Math.round(frameHeight);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia");

  context.fillStyle = POSTER_COLORS.paper;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.fillStyle = POSTER_COLORS.accent;
  context.font = `500 20px ${POSTER_TYPOGRAPHY.meta}`;
  context.fillText("VANRY CAM", MARGIN, MARGIN + 20);

  context.fillStyle = POSTER_COLORS.ink;
  context.font = `600 58px ${POSTER_TYPOGRAPHY.heading}`;
  context.fillText(input.couple ?? "Evan & Inri", MARGIN, MARGIN + 90);

  context.strokeStyle = POSTER_COLORS.line;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(MARGIN, MARGIN + 118);
  context.lineTo(FRAME_WIDTH - MARGIN, MARGIN + 118);
  context.stroke();

  context.fillStyle = POSTER_COLORS.ink;
  context.font = `italic 26px ${POSTER_TYPOGRAPHY.heading}`;
  const caption = input.guest
    ? `Catatan dari ${input.guest}${input.dateLabel ? ` · ${input.dateLabel}` : ""}`
    : "Catatan kecil dari tamu";
  context.fillText(caption, MARGIN, MARGIN + 158);

  const gridTop = MARGIN + HEADER_HEIGHT;
  images.forEach((image, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = MARGIN + column * (tileSize + GAP);
    const y = gridTop + row * (tileSize + GAP);
    context.save();
    context.beginPath();
    context.rect(x, y, tileSize, tileSize);
    context.clip();
    context.fillStyle = POSTER_COLORS.white;
    context.fillRect(x, y, tileSize, tileSize);
    drawCover(context, image, x, y, tileSize, tileSize);
    context.restore();
    context.strokeStyle = POSTER_COLORS.line;
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);
  });

  const footerTop = gridTop + gridHeight + 40;
  context.strokeStyle = POSTER_COLORS.accent;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(MARGIN, footerTop);
  context.lineTo(MARGIN + 70, footerTop);
  context.stroke();

  context.fillStyle = POSTER_COLORS.ink;
  context.font = `400 34px ${POSTER_TYPOGRAPHY.heading}`;
  context.fillText("Evan + Inri", MARGIN, footerTop + 46);

  context.fillStyle = POSTER_COLORS.accent;
  context.font = `500 18px ${POSTER_TYPOGRAPHY.meta}`;
  context.fillText("Muara Teweh · 2026", MARGIN, footerTop + 78);

  drawStamp(context, FRAME_WIDTH - MARGIN - 70, footerTop + 40);

  let blob = await toJpeg(canvas, 0.92);
  for (
    let quality = 0.85;
    quality >= 0.4 && blob.size > MAX_COLLAGE_BYTES;
    quality -= 0.1
  ) {
    blob = await toJpeg(canvas, quality);
  }
  return blob;
}