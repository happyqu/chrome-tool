import { ssimThresholds } from "./presets";
import type { CompressCandidate, CompressResult, CompressionMode } from "../types";
import { calculateSavedPercent } from "../utils/format";
import { toArrayBuffer } from "../utils/image-data";

export function pickBestCandidate(
  original: Uint8Array,
  candidates: CompressCandidate[],
  options: {
    mode: CompressionMode;
    allowKeepOriginal: boolean;
  }
): CompressResult {
  const originalSize = original.byteLength;
  const smaller = candidates.filter(candidate => candidate.buffer.byteLength < originalSize);
  const pool = smaller.length > 0 ? smaller : candidates;
  const threshold = ssimThresholds[options.mode];
  const scored = pool.filter(candidate => candidate.qualityScore === undefined || candidate.qualityScore >= threshold);
  const usable = scored.length > 0 ? scored : pool;
  const best = [...usable].sort((a, b) => a.buffer.byteLength - b.buffer.byteLength)[0];

  if (!best || (options.allowKeepOriginal && best.buffer.byteLength >= originalSize)) {
    return toResult(
      {
        buffer: toArrayBuffer(original),
        mimeType: "application/octet-stream",
        extension: "bin",
        strategy: "original-kept"
      },
      originalSize
    );
  }

  return toResult(best, originalSize);
}

export function toResult(candidate: CompressCandidate, originalSize: number): CompressResult {
  const compressedSize = candidate.buffer.byteLength;
  const savedBytes = Math.max(0, originalSize - compressedSize);
  return {
    ...candidate,
    originalSize,
    compressedSize,
    savedBytes,
    savedPercent: calculateSavedPercent(originalSize, compressedSize)
  };
}
