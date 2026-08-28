const MAX_IMAGE_PIXELS = 40_000_000;

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

function readU32BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  for (let i = 2; i + 9 < bytes.length;) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    i += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (i + 1 >= bytes.length) return null;
    const length = (bytes[i] << 8) | bytes[i + 1];
    if (length < 2 || i + length > bytes.length) return null;
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: (bytes[i + 3] << 8) | bytes[i + 4], width: (bytes[i + 5] << 8) | bytes[i + 6] };
    }
    i += length;
  }
  return null;
}

export function validateImageBytes(bytes: Uint8Array): { ok: true; type: SupportedImageType } | { ok: false; error: string } {
  if (bytes.length < 12) return { ok: false, error: "Image file is empty or malformed" };

  let type: SupportedImageType | null = null;
  let dimensions: { width: number; height: number } | null = null;
  const isPng = bytes.slice(0, 8).every((byte, index) => byte === [137, 80, 78, 71, 13, 10, 26, 10][index]);
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";

  if (isPng) {
    if (bytes.length < 24 || String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return { ok: false, error: "Malformed PNG image" };
    type = "image/png";
    dimensions = { width: readU32BE(bytes, 16) >>> 0, height: readU32BE(bytes, 20) >>> 0 };
  } else if (isJpeg) {
    type = "image/jpeg";
    dimensions = jpegDimensions(bytes);
    if (!dimensions) return { ok: false, error: "Malformed JPEG image" };
  } else if (isWebp) {
    type = "image/webp";
  } else {
    return { ok: false, error: "Unsupported image content. Use JPG, PNG, or WebP." };
  }

  if (dimensions && (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > MAX_IMAGE_PIXELS)) {
    return { ok: false, error: "Image dimensions are invalid or too large" };
  }
  return { ok: true, type };
}
