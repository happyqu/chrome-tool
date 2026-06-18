import { calculateSavedPercent } from "../utils/format";
import { toArrayBuffer } from "../utils/image-data";

export function normalizeResizeSize(
  originalWidth?: number,
  originalHeight?: number,
  targetWidth?: number,
  targetHeight?: number
) {
  if (!originalWidth || !originalHeight || !targetWidth || !targetHeight) {
    return null;
  }

  const width = Math.max(1, Math.round(targetWidth));
  const height = Math.max(1, Math.round(targetHeight));
  if (width === originalWidth && height === originalHeight) {
    return null;
  }

  return { width, height };
}

export async function resizeImageInput(
  input: Uint8Array,
  mimeType: string,
  targetWidth?: number,
  targetHeight?: number
): Promise<{ input: Uint8Array; resized: boolean; width?: number; height?: number }> {
  if (!targetWidth || !targetHeight) {
    return { input, resized: false };
  }

  const source = new Blob([toArrayBuffer(input)], { type: mimeType });
  const bitmap = await createImageBitmap(source);
  const width = Math.max(1, Math.round(targetWidth));
  const height = Math.max(1, Math.round(targetHeight));

  if (bitmap.width === width && bitmap.height === height) {
    bitmap.close();
    return { input, resized: false, width, height };
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: mimeType !== "image/jpeg" });
  if (!ctx) {
    bitmap.close();
    throw new Error("图片尺寸调整不可用");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: mimeType === "image/png" ? undefined : 0.95
  });
  const buffer = await blob.arrayBuffer();
  return { input: new Uint8Array(buffer), resized: true, width, height };
}

export function rewriteResultOriginalSize(result: { originalSize: number; compressedSize: number; savedBytes: number; savedPercent: number }, originalSize: number) {
  result.originalSize = originalSize;
  result.savedBytes = Math.max(0, originalSize - result.compressedSize);
  result.savedPercent = calculateSavedPercent(originalSize, result.compressedSize);
}
