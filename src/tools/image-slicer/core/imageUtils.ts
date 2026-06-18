export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = url;

  try {
    await image.decode();
  } finally {
    URL.revokeObjectURL(url);
  }

  return image;
}

export async function loadImageFromClipboard(): Promise<File | null> {
  const items = await navigator.clipboard.read();

  for (const item of items) {
    const imageType = item.types.find(type => type.startsWith("image/"));
    if (!imageType) {
      continue;
    }
    const blob = await item.getType(imageType);
    const extension = imageType.split("/")[1] || "png";
    return new File([blob], `clipboard-image.${extension}`, { type: imageType });
  }

  return null;
}

export function getImageData(image: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("无法读取图片像素");
  }
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
