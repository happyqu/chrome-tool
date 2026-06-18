import { computed, onBeforeUnmount, ref } from "vue";
import { saveAs } from "file-saver";
import { exportCompressedImagesToZip } from "../core/zip";
import { generateCompressedFileName } from "../core/naming";
import { CompressWorkerPool } from "../worker/worker-pool";
import {
  createObjectUrlFromResult,
  fileToArrayBuffer,
  isSupportedImageType,
  revokeObjectUrl
} from "../utils/format";
import type { CompressFileItem, CompressOptions, SupportedImageMimeType } from "../types";

const MAX_FILE_SIZE = 40 * 1024 * 1024;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function readImageSize(file: File, previewUrl: string): Promise<{ width: number; height: number }> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("图片尺寸读取失败"));
    image.src = previewUrl;
  });
}

export function useImageCompressor() {
  const pool = new CompressWorkerPool(2);
  const items = ref<CompressFileItem[]>([]);
  const isZipGenerating = ref(false);
  const notice = ref("上传图片后会在这里显示压缩队列和结果");

  const stats = computed(() => {
    const originalTotal = items.value.reduce((sum, item) => sum + item.originalSize, 0);
    const compressedTotal = items.value.reduce((sum, item) => sum + (item.result?.compressedSize ?? 0), 0);
    const completed = items.value.filter(item => item.status === "success" || item.status === "skipped").length;
    const failed = items.value.filter(item => item.status === "failed").length;
    const savedBytes = Math.max(0, originalTotal - compressedTotal);
    const savedPercent = originalTotal ? Number(((savedBytes / originalTotal) * 100).toFixed(2)) : 0;
    return {
      count: items.value.length,
      completed,
      failed,
      originalTotal,
      compressedTotal,
      savedBytes,
      savedPercent,
      downloadable: items.value.filter(item => item.result).length
    };
  });

  function addFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files);
    let added = 0;
    for (const file of nextFiles) {
      if (!isSupportedImageType(file.type)) {
        notice.value = `${file.name} 不是支持的图片类型`;
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        notice.value = `${file.name} 超过 40 MB，已跳过`;
        continue;
      }
      const id = createId();
      const previewUrl = URL.createObjectURL(file);
      const item: CompressFileItem = {
        id,
        file,
        fileName: file.name,
        mimeType: file.type as SupportedImageMimeType,
        originalSize: file.size,
        status: "pending",
        progress: 0,
        previewUrl
      };
      items.value.push(item);
      void readImageSize(file, previewUrl)
        .then(size => {
          item.width = size.width;
          item.height = size.height;
          item.targetWidth = size.width;
          item.targetHeight = size.height;
          notice.value = `已读取 ${item.fileName} 尺寸 ${size.width} x ${size.height}`;
        })
        .catch(error => {
          item.error = error instanceof Error ? error.message : "图片尺寸读取失败";
        });
      added += 1;
    }
    if (added) notice.value = `已添加 ${added} 张图片`;
  }

  function removeItem(id: string) {
    const target = items.value.find(item => item.id === id);
    revokeItemUrls(target);
    items.value = items.value.filter(item => item.id !== id);
  }

  function clearItems() {
    items.value.forEach(revokeItemUrls);
    items.value = [];
    notice.value = "已清空列表";
  }

  async function compressOne(item: CompressFileItem, options: CompressOptions) {
    item.status = "compressing";
    item.error = undefined;
    item.progress = 15;
    revokeObjectUrl(item.outputUrl);
    item.outputUrl = undefined;
    item.result = undefined;

    try {
      const buffer = await fileToArrayBuffer(item.file);
      item.progress = 35;
      const response = await pool.run({
        id: item.id,
        fileName: item.fileName,
        mimeType: item.mimeType,
        buffer,
        mode: options.mode,
        allowConvertToWebp: options.allowConvertToWebp && !options.preserveOriginalFormat,
        allowKeepOriginal: options.allowKeepOriginal,
        targetWidth: item.targetWidth,
        targetHeight: item.targetHeight
      });

      if (!response.ok) {
        throw new Error(response.error);
      }

      item.result = response.result;
      item.outputUrl = createObjectUrlFromResult(response.result);
      item.status = response.result.strategy === "original-kept" ? "skipped" : "success";
      item.progress = 100;
      notice.value = `${item.fileName} 压缩完成`;
    } catch (error) {
      item.status = "failed";
      item.progress = 0;
      item.error = error instanceof Error ? error.message : "压缩失败，请尝试更换压缩模式或保留原格式";
      notice.value = item.error;
    }
  }

  async function compressAll(options: CompressOptions) {
    const targets = items.value.filter(item => item.status !== "compressing");
    await Promise.all(targets.map(item => compressOne(item, options)));
  }

  function downloadOne(item: CompressFileItem) {
    if (!item.result) return;
    const blob = new Blob([item.result.buffer], { type: item.result.mimeType });
    saveAs(blob, generateCompressedFileName(item.fileName, item.result.extension));
  }

  async function downloadZip() {
    isZipGenerating.value = true;
    try {
      const blob = await exportCompressedImagesToZip(items.value);
      saveAs(blob, "compressed-images.zip");
      notice.value = "已生成 compressed-images.zip";
    } catch (error) {
      notice.value = error instanceof Error ? error.message : "ZIP 生成失败";
    } finally {
      isZipGenerating.value = false;
    }
  }

  function revokeItemUrls(item?: CompressFileItem) {
    if (!item) return;
    revokeObjectUrl(item.previewUrl);
    revokeObjectUrl(item.outputUrl);
  }

  onBeforeUnmount(() => {
    items.value.forEach(revokeItemUrls);
  });

  return {
    items,
    stats,
    notice,
    isZipGenerating,
    addFiles,
    removeItem,
    clearItems,
    compressOne,
    compressAll,
    downloadOne,
    downloadZip
  };
}
