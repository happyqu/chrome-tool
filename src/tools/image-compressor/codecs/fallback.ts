import type { CompressCandidate } from "../types";
import { toArrayBuffer } from "../utils/image-data";

export async function canvasEncodeFallback(
  input: Uint8Array,
  mimeType: "image/png" | "image/jpeg" | "image/webp",
  quality: number,
  strategy = "canvas-fallback"
): Promise<CompressCandidate> {
  const blob = new Blob([toArrayBuffer(input)], { type: mimeType });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas fallback unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const output = await canvas.convertToBlob({ type: mimeType, quality: quality / 100 });
  return {
    buffer: await output.arrayBuffer(),
    mimeType,
    extension: mimeType === "image/jpeg" ? "jpg" : mimeType.replace("image/", ""),
    strategy
  };
}
