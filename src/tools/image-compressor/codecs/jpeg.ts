import { decode as decodeJpeg, encode as encodeJpeg } from "@jsquash/jpeg";
import { compressionPresets } from "../core/presets";
import { pickBestCandidate } from "../core/candidates";
import type { CompressCandidate, CompressResult, CompressionMode } from "../types";
import { canvasEncodeFallback } from "./fallback";
import { encodeImageDataToWebp } from "./webp";
import { toArrayBuffer } from "../utils/image-data";

export async function compressJpegBest(
  input: Uint8Array,
  options: {
    mode: CompressionMode;
    allowConvertToWebp: boolean;
    allowKeepOriginal: boolean;
  }
): Promise<CompressResult> {
  const preset = compressionPresets[options.mode];
  const candidates: CompressCandidate[] = [];
  let imageData: ImageData | null = null;

  try {
    imageData = await decodeJpeg(toArrayBuffer(input), {
      preserveOrientation: true
    });
    const jpegBuffer = await encodeJpeg(imageData, {
      quality: preset.jpegQuality,
      progressive: true,
      optimize_coding: true,
      chroma_quality: preset.jpegQuality,
      trellis_multipass: options.mode === "extreme"
    });
    candidates.push({
      buffer: jpegBuffer,
      mimeType: "image/jpeg",
      extension: "jpg",
      strategy: "jpeg-progressive"
    });
  } catch (error) {
    try {
      candidates.push(await canvasEncodeFallback(input, "image/jpeg", preset.jpegQuality, "canvas-fallback"));
    } catch {
      throw error instanceof Error ? error : new Error("JPEG compression failed");
    }
  }

  if (options.allowConvertToWebp) {
    try {
      imageData ??= await decodeJpeg(toArrayBuffer(input));
      candidates.push(await encodeImageDataToWebp(imageData, options.mode, "jpeg-to-webp"));
    } catch {
      // WebP is an optional candidate; JPEG output can still succeed.
    }
  }

  const result = pickBestCandidate(input, candidates, options);
  if (result.strategy === "original-kept") {
    result.mimeType = "image/jpeg";
    result.extension = "jpg";
  }
  return result;
}
