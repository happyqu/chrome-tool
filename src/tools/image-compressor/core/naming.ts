export function generateCompressedFileName(originalFileName: string, extension: string): string {
  const cleanExtension = extension.replace(/^\./, "");
  const baseName = originalFileName.replace(/\.[^.]+$/, "") || "image";
  return `${baseName}.tiny.${cleanExtension}`;
}

export function dedupeFileName(fileName: string, usedNames: Set<string>): string {
  if (!usedNames.has(fileName)) {
    usedNames.add(fileName);
    return fileName;
  }

  const extensionMatch = fileName.match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1] ?? "";
  const base = extension ? fileName.slice(0, -extension.length) : fileName;
  let index = 2;
  let next = `${base}-${index}${extension}`;
  while (usedNames.has(next)) {
    index += 1;
    next = `${base}-${index}${extension}`;
  }
  usedNames.add(next);
  return next;
}
