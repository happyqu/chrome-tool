import { decode as decodePng, encode as encodePng } from "@jsquash/png";
import { optimise } from "@jsquash/oxipng";
import { compressionPresets } from "../core/presets";
import { pickBestCandidate } from "../core/candidates";
import type { CompressCandidate, CompressResult, CompressionMode } from "../types";
import { canvasEncodeFallback } from "./fallback";
import { encodeImageDataToWebp } from "./webp";
import { toArrayBuffer } from "../utils/image-data";

export async function compressPngBest(
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
    const lossless = await optimise(toArrayBuffer(input), {
      level: preset.oxipngLevel,
      interlace: false,
      optimiseAlpha: true
    });
    candidates.push({
      buffer: lossless,
      mimeType: "image/png",
      extension: "png",
      strategy: "png-oxipng-lossless"
    });
  } catch {
    // Continue with re-encode/fallback candidates.
  }

  try {
    imageData = await decodePng(toArrayBuffer(input));
    const encoded = await encodePng(imageData, { bitDepth: 8 });
    const optimised = await optimise(encoded, {
      level: preset.oxipngLevel,
      interlace: false,
      optimiseAlpha: true
    });
    candidates.push({
      buffer: optimised,
      mimeType: "image/png",
      extension: "png",
      strategy: "png-quantized-oxipng"
    });
  } catch {
    try {
      candidates.push(await canvasEncodeFallback(input, "image/png", preset.pngQualityMax, "canvas-fallback"));
    } catch {
      // Original-kept below can still keep the item usable.
    }
  }

  if (options.allowConvertToWebp) {
    try {
      imageData ??= await decodePng(toArrayBuffer(input));
      candidates.push(await encodeImageDataToWebp(imageData, options.mode, "png-to-webp"));
    } catch {
      // Optional candidate.
    }
  }

  const result = pickBestCandidate(input, candidates, options);
  if (result.strategy === "original-kept") {
    result.mimeType = "image/png";
    result.extension = "png";
  }
  return result;
}
