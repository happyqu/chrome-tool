<script setup lang="ts">
import { computed, ref } from "vue";
import { CircleClose, Refresh, UploadFilled } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type { DecodeResult, DecodeStatus } from "../types";
import { formatBytes } from "../core/format";

const props = defineProps<{
  status: DecodeStatus;
  result: DecodeResult | null;
}>();

const emit = defineEmits<{
  select: [file: File];
  retry: [];
  clear: [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

const statusText = computed(() => {
  if (props.status === "loading") return "正在识别二维码...";
  if (props.status === "success") return "识别成功";
  if (props.status === "failed") return "未识别到二维码";
  return "拖拽二维码图片到这里，或点击上传";
});

function openFilePicker() {
  inputRef.value?.click();
}

function pickFile(files: FileList | null) {
  const file = files?.[0];
  if (file) emit("select", file);
  if (inputRef.value) inputRef.value.value = "";
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const files = Array.from(event.dataTransfer?.files || []);
  const file = files.find(item => item.type.startsWith("image/"));

  if (file) {
    emit("select", file);
    return;
  }

  ElMessage.warning("请上传图片文件");
}
</script>

<template>
  <section class="qr-card upload-card">
    <div class="card-heading">
      <strong>上传识别</strong>
      <span>PNG / JPG / JPEG / WEBP / GIF，单张最大 10MB</span>
    </div>

    <input
      ref="inputRef"
      class="hidden-input"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      @change="pickFile(($event.target as HTMLInputElement).files)"
    />

    <button
      type="button"
      class="decode-dropzone"
      :class="{ 'is-dragging': isDragging, [`is-${status}`]: true }"
      @click="openFilePicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <el-icon class="drop-icon"><UploadFilled /></el-icon>
      <strong>{{ isDragging ? "释放鼠标开始识别" : statusText }}</strong>
      <span>支持 PNG、JPG、JPEG、WEBP，也可以直接 Ctrl + V 粘贴截图</span>
    </button>

    <div v-if="result" class="preview-panel">
      <img :src="result.imageUrl" :alt="result.fileName" />
      <div class="preview-meta">
        <strong :title="result.fileName">{{ result.fileName }}</strong>
        <span>{{ formatBytes(result.fileSize) }}</span>
        <span>{{ new Date(result.createdAt).toLocaleString() }}</span>
      </div>
    </div>

    <div class="upload-actions">
      <el-button type="primary" :icon="UploadFilled" @click="openFilePicker">上传图片</el-button>
      <el-button :icon="Refresh" :disabled="status !== 'failed' && status !== 'success'" @click="emit('retry')">
        增强后重试
      </el-button>
      <el-button :icon="CircleClose" :disabled="!result" @click="emit('clear')">清空结果</el-button>
    </div>
  </section>
</template>
