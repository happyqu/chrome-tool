import { compressJpegBest } from "../codecs/jpeg";
import { compressPngBest } from "../codecs/png";
import { compressWebpBest } from "../codecs/webp";
import { resizeImageInput, rewriteResultOriginalSize } from "./resize";
import type { CompressResult, CompressionMode } from "../types";

export async function compressImageBest(
  input: Uint8Array,
  options: {
    mimeType: string;
    mode: CompressionMode;
    allowConvertToWebp: boolean;
    allowKeepOriginal: boolean;
    targetWidth?: number;
    targetHeight?: number;
  }
): Promise<CompressResult> {
  const originalSize = input.byteLength;
  const resized = await resizeImageInput(input, options.mimeType, options.targetWidth, options.targetHeight);
  const source = resized.input;
  let result: CompressResult;

  if (options.mimeType === "image/png") {
    result = await compressPngBest(source, options);
  } else if (options.mimeType === "image/jpeg") {
    result = await compressJpegBest(source, options);
  } else if (options.mimeType === "image/webp") {
    result = await compressWebpBest(source, options);
  } else {
    throw new Error("Unsupported image type");
  }

  if (resized.resized) {
    result.width = resized.width;
    result.height = resized.height;
    rewriteResultOriginalSize(result, originalSize);
    if (result.strategy === "original-kept") {
      result.strategy = "resize-only";
      result.mimeType = options.mimeType;
      result.extension = options.mimeType === "image/jpeg" ? "jpg" : options.mimeType.replace("image/", "");
    }
  }

  return result;
}
