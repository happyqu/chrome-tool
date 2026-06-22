<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import QrDecodeHistory from "./QrDecodeHistory.vue";
import QrDecodeResult from "./QrDecodeResult.vue";
import QrDecodeUpload from "./QrDecodeUpload.vue";
import { detectQrContentType } from "../core/qrContentDetect";
import { decodeWithFallback } from "../core/qrImageEnhance";
import type { DecodeResult, DecodeStatus, QrDecodeHistoryItem } from "../types";

const props = defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  regenerate: [content: string];
}>();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const HISTORY_KEY = "qrDecodeHistory";
const status = ref<DecodeStatus>("idle");
const result = ref<DecodeResult | null>(null);
const history = ref<QrDecodeHistoryItem[]>([]);
const lastFile = ref<File | null>(null);

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function revokePreview() {
  if (result.value?.imageUrl) {
    URL.revokeObjectURL(result.value.imageUrl);
  }
}

function validateFile(file: File) {
  if (!file.type.startsWith("image/")) {
    ElMessage.warning("请上传图片文件");
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    ElMessage.warning("图片文件过大，请上传 10MB 以内的图片。");
    return false;
  }

  return true;
}

async function loadHistory() {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    const value = await chrome.storage.local.get(HISTORY_KEY);
    history.value = value[HISTORY_KEY] || [];
    return;
  }

  history.value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

async function saveHistory(items: QrDecodeHistoryItem[]) {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    await chrome.storage.local.set({ [HISTORY_KEY]: items });
    return;
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

async function pushHistory(item: QrDecodeHistoryItem) {
  const items = [item, ...history.value.filter(current => current.content !== item.content)].slice(0, 30);
  history.value = items;
  await saveHistory(items);
}

async function handleDecodeFile(file: File) {
  if (!validateFile(file)) return;

  lastFile.value = file;
  status.value = "loading";
  revokePreview();

  const nextResult: DecodeResult = {
    id: createId(),
    fileName: file.name || "paste-image.png",
    fileSize: file.size,
    imageUrl: URL.createObjectURL(file),
    content: "",
    contentType: "unknown",
    status: "loading",
    createdAt: Date.now()
  };

  result.value = nextResult;

  try {
    const content = await decodeWithFallback(file);

    if (!content) {
      status.value = "failed";
      result.value = {
        ...nextResult,
        status: "failed",
        errorMessage: "未识别到二维码"
      };
      return;
    }

    const contentType = detectQrContentType(content);
    const successResult: DecodeResult = {
      ...nextResult,
      content,
      contentType,
      status: "success"
    };

    status.value = "success";
    result.value = successResult;
    await pushHistory({
      id: successResult.id,
      content,
      contentType,
      fileName: file.name,
      createdAt: successResult.createdAt
    });
  } catch (error) {
    status.value = "failed";
    result.value = {
      ...nextResult,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "识别失败"
    };
  }
}

function handlePaste(event: ClipboardEvent) {
  if (!props.active) return;

  const items = Array.from(event.clipboardData?.items || []);
  const imageItem = items.find(item => item.type.startsWith("image/"));
  const file = imageItem?.getAsFile();

  if (file) {
    event.preventDefault();
    void handleDecodeFile(file);
  }
}

async function copyText(content: string) {
  try {
    await navigator.clipboard.writeText(content);
    ElMessage.success("已复制到剪贴板");
  } catch {
    ElMessage.error("复制失败，请手动复制");
  }
}

function retryLastFile() {
  if (!lastFile.value) {
    ElMessage.info("请先上传二维码图片");
    return;
  }

  void handleDecodeFile(lastFile.value);
}

function clearResult() {
  revokePreview();
  result.value = null;
  status.value = "idle";
}

async function removeHistory(id: string) {
  const items = history.value.filter(item => item.id !== id);
  history.value = items;
  await saveHistory(items);
}

async function clearHistory() {
  if (!history.value.length) return;
  await ElMessageBox.confirm("确定清空全部识别历史吗？", "清空历史", {
    confirmButtonText: "清空",
    cancelButtonText: "取消",
    type: "warning"
  });
  history.value = [];
  await saveHistory([]);
}

onMounted(() => {
  void loadHistory();
  window.addEventListener("paste", handlePaste);
});

onBeforeUnmount(() => {
  window.removeEventListener("paste", handlePaste);
  revokePreview();
});
</script>

<template>
  <section class="decoder-panel">
    <section class="decode-layout">
      <QrDecodeUpload :status="status" :result="result" @select="handleDecodeFile" @retry="retryLastFile" @clear="clearResult" />
      <QrDecodeResult :status="status" :result="result" @copy="copyText" @retry="retryLastFile" @regenerate="emit('regenerate', $event)" />
    </section>

    <QrDecodeHistory
      :items="history"
      @copy="copyText"
      @regenerate="emit('regenerate', $event)"
      @remove="removeHistory"
      @clear="clearHistory"
    />
  </section>
</template>
