import type { CompressResult, SupportedImageMimeType } from "../types";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

export function calculateSavedPercent(originalSize: number, compressedSize: number): number {
  if (!originalSize) return 0;
  return Number((((originalSize - compressedSize) / originalSize) * 100).toFixed(2));
}

export function isSupportedImageType(mimeType: string): mimeType is SupportedImageMimeType {
  return mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/webp";
}

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export function createObjectUrlFromResult(result: CompressResult): string {
  return URL.createObjectURL(new Blob([result.buffer], { type: result.mimeType }));
}

export function revokeObjectUrl(url?: string): void {
  if (url) URL.revokeObjectURL(url);
}

export function getSavedPercentClass(savedPercent: number): string {
  if (savedPercent >= 50) return "is-excellent";
  if (savedPercent >= 20) return "is-good";
  if (savedPercent > 0) return "is-modest";
  return "is-neutral";
}
