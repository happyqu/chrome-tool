import type { ExportOptions, SliceRect } from "../types";
import { normalizeFormat } from "./format";

function padIndex(index: number): string {
  return String(index + 1).padStart(3, "0");
}

function sanitizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "slice";
}

export function generateSliceBaseName(
  slice: SliceRect,
  index: number,
  options: ExportOptions
): string {
  const prefix = sanitizeName(options.prefix || "slice");
  const name = sanitizeName(slice.name);
  const template = options.fileNameTemplate || "{prefix}-{index}";

  return sanitizeName(
    template
      .replaceAll("{prefix}", prefix)
      .replaceAll("{index}", padIndex(index))
      .replaceAll("{name}", name)
      .replaceAll("{x}", String(Math.round(slice.x)))
      .replaceAll("{y}", String(Math.round(slice.y)))
      .replaceAll("{width}", String(Math.round(slice.width)))
      .replaceAll("{height}", String(Math.round(slice.height)))
  );
}

export function generateSliceFileName(
  slice: SliceRect,
  index: number,
  options: ExportOptions
): string {
  const format = normalizeFormat(slice.format ?? options.format);
  return `${generateSliceBaseName(slice, index, options)}.${format}`;
}
