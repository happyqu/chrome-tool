import type { ImageOutputFormat } from "../types";

export function getMimeType(format: ImageOutputFormat): string {
  if (format === "jpg" || format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "webp") {
    return "image/webp";
  }
  if (format === "avif") {
    return "image/avif";
  }
  return "image/png";
}

export function normalizeFormat(format: ImageOutputFormat): ImageOutputFormat {
  return format === "jpeg" ? "jpg" : format;
}
