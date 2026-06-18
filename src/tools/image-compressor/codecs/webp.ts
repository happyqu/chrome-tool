import { decode as decodeWebp, encode as encodeWebp } from "@jsquash/webp";
import { compressionPresets } from "../core/presets";
import { pickBestCandidate } from "../core/candidates";
import type { CompressCandidate, CompressResult, CompressionMode } from "../types";
import { canvasEncodeFallback } from "./fallback";
import { toArrayBuffer } from "../utils/image-data";

export async function encodeImageDataToWebp(
  imageData: ImageData,
  mode: CompressionMode,
  strategy = "webp-lossy"
): Promise<CompressCandidate> {
  const preset = compressionPresets[mode];
  const buffer = await encodeWebp(imageData, {
    quality: preset.webpQuality,
    method: mode === "extreme" ? 6 : 4,
    pass: mode === "high" ? 1 : 2,
    alpha_quality: mode === "extreme" ? 85 : 100
  });
  return {
    buffer,
    mimeType: "image/webp",
    extension: "webp",
    strategy
  };
}

export async function compressWebpBest(
  input: Uint8Array,
  options: {
    mode: CompressionMode;
    allowKeepOriginal: boolean;
  }
): Promise<CompressResult> {
  const candidates: CompressCandidate[] = [];
  try {
    const imageData = await decodeWebp(toArrayBuffer(input));
    candidates.push(await encodeImageDataToWebp(imageData, options.mode, "webp-reencode"));
  } catch (error) {
    try {
      candidates.push(await canvasEncodeFallback(input, "image/webp", compressionPresets[options.mode].webpQuality));
    } catch {
      throw error instanceof Error ? error : new Error("WebP compression failed");
    }
  }

  const result = pickBestCandidate(input, candidates, options);
  if (result.strategy === "original-kept") {
    result.mimeType = "image/webp";
    result.extension = "webp";
  }
  return result;
}
