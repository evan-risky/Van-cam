import {
  MAX_PHOTO_DIMENSION,
  MIN_PHOTO_DIMENSION,
} from "@/lib/config";

export type ImageDimensions = {
  width: number;
  height: number;
};

function readJpeg(data: Buffer): ImageDimensions | null {
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1]!;
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) {
      return null;
    }
    const length = data.readUInt16BE(offset + 2);
    if (length < 2) return null;
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isStartOfFrame) {
      const height = data.readUInt16BE(offset + 5);
      const width = data.readUInt16BE(offset + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
}

function readWebp(data: Buffer): ImageDimensions | null {
  const chunk = data.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    const width = 1 + data.readUIntLE(24, 3);
    const height = 1 + data.readUIntLE(27, 3);
    return { width, height };
  }
  if (chunk === "VP8 ") {
    const width = data.readUInt16LE(26) & 0x3fff;
    const height = data.readUInt16LE(28) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunk === "VP8L") {
    const b0 = data[21]!;
    const b1 = data[22]!;
    const b2 = data[23]!;
    const b3 = data[24]!;
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  return null;
}

export function readImageDimensions(data: Buffer): ImageDimensions | null {
  if (data.length < 12) return null;

  if (data[0] === 0xff && data[1] === 0xd8) {
    return readJpeg(data);
  }

  if (
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    if (data.length < 24) return null;
    const width = data.readUInt32BE(16);
    const height = data.readUInt32BE(20);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  if (
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) {
    return readWebp(data);
  }

  return null;
}

export function isAcceptableDimensions(dimensions: ImageDimensions): boolean {
  const { width, height } = dimensions;
  return (
    width >= MIN_PHOTO_DIMENSION &&
    height >= MIN_PHOTO_DIMENSION &&
    width <= MAX_PHOTO_DIMENSION &&
    height <= MAX_PHOTO_DIMENSION
  );
}