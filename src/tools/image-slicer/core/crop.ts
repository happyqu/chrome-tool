import type { ExportOptions, SliceRect } from "../types";
import { getMimeType } from "./format";

function clampRect(image: HTMLImageElement, rect: SliceRect): SliceRect {
  const imageWidth = image.naturalWidth;
  const imageHeight = image.naturalHeight;
  const x = Math.max(0, Math.min(Math.round(rect.x), imageWidth - 1));
  const y = Math.max(0, Math.min(Math.round(rect.y), imageHeight - 1));
  const width = Math.max(1, Math.min(Math.round(rect.width), imageWidth - x));
  const height = Math.max(1, Math.min(Math.round(rect.height), imageHeight - y));
  return { ...rect, x, y, width, height };
}

export async function cropImageToBlob(
  image: HTMLImageElement,
  rect: SliceRect,
  options: ExportOptions
): Promise<Blob> {
  const safeRect = clampRect(image, rect);
  const scale = options.scale;
  const canvas = document.createElement("canvas");
  canvas.width = safeRect.width * scale;
  canvas.height = safeRect.height * scale;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("无法创建裁剪画布");
  }

  const format = rect.format ?? options.format;
  if (format === "jpg" || format === "jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    safeRect.x,
    safeRect.y,
    safeRect.width,
    safeRect.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("当前浏览器不支持该导出格式"));
        }
      },
      getMimeType(format),
      options.quality
    );
  });
}
