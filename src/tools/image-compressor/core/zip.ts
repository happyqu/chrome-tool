import JSZip from "jszip";
import type { CompressFileItem } from "../types";
import { dedupeFileName, generateCompressedFileName } from "./naming";

export async function exportCompressedImagesToZip(items: CompressFileItem[]): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder("images");
  if (!folder) throw new Error("ZIP folder create failed");

  const usedNames = new Set<string>();
  for (const item of items) {
    if ((item.status !== "success" && item.status !== "skipped") || !item.result) continue;
    const outputName = dedupeFileName(generateCompressedFileName(item.fileName, item.result.extension), usedNames);
    folder.file(outputName, item.result.buffer);
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
