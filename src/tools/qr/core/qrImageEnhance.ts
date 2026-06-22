import { decodeQrFromFile } from "./qrDecode";

async function fileToImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    };
    image.src = url;
  });
}

export async function decodeWithFallback(file: File): Promise<string | null> {
  const firstResult = await decodeQrFromFile(file);
  if (firstResult) return firstResult;

  const enhancedFile = await enhanceQrImage(file);
  return decodeQrFromFile(enhancedFile);
}

export async function enhanceQrImage(file: File): Promise<File> {
  const image = await fileToImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width * 2;
  canvas.height = image.height * 2;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return file;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if ("close" in image) {
    image.close();
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const boosted = (gray - 128) * 1.35 + 128;
    const contrast = boosted > 128 ? 255 : 0;
    data[i] = contrast;
    data[i + 1] = contrast;
    data[i + 2] = contrast;
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) {
        resolve(file);
        return;
      }
      resolve(new File([blob], file.name, { type: file.type || "image/png" }));
    }, file.type || "image/png");
  });
}
