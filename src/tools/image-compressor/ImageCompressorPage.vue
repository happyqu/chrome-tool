<script setup lang="ts">
import { computed, ref } from "vue";
import { Delete, Download, Refresh, UploadFilled, VideoPlay } from "@element-plus/icons-vue";
import { compressionPresets } from "./core/presets";
import { useImageCompressor } from "./hooks/useImageCompressor";
import { formatBytes, getSavedPercentClass } from "./utils/format";
import type { CompressFileItem, CompressOptions, CompressStatus, CompressionMode } from "./types";

const uploadInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const previewItem = ref<CompressFileItem | null>(null);
const options = ref<CompressOptions>({
  mode: "balanced",
  allowConvertToWebp: false,
  allowKeepOriginal: true,
  preserveOriginalFormat: true
});

const {
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
} = useImageCompressor();

const modeOptions = computed(() =>
  (Object.keys(compressionPresets) as CompressionMode[]).map(value => ({
    label: compressionPresets[value].label,
    value
  }))
);

const hasCompressing = computed(() => items.value.some(item => item.status === "compressing"));
const hasDownloadable = computed(() => stats.value.downloadable > 0);
const actualCompressedTotal = computed(() => (stats.value.downloadable ? stats.value.compressedTotal : 0));
const previewVisible = computed({
  get: () => Boolean(previewItem.value),
  set: value => {
    if (!value) previewItem.value = null;
  }
});

const statusMap: Record<CompressStatus, { label: string; type: "info" | "primary" | "success" | "warning" | "danger" }> = {
  pending: { label: "等待压缩", type: "info" },
  compressing: { label: "压缩中", type: "primary" },
  success: { label: "已压缩", type: "success" },
  skipped: { label: "已接近最优", type: "warning" },
  failed: { label: "失败", type: "danger" }
};

function openUploader() {
  uploadInputRef.value?.click();
}

function handleInput(files: FileList | null) {
  if (files) addFiles(files);
  if (uploadInputRef.value) uploadInputRef.value.value = "";
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files) addFiles(files);
}

function compressFailed() {
  const failed = items.value.filter(item => item.status === "failed");
  void Promise.all(failed.map(item => compressOne(item, options.value)));
}

function resultText(item: CompressFileItem) {
  if (item.status === "failed") return item.error || "压缩失败，请尝试更换压缩模式或保留原格式";
  if (!item.result) return "等待压缩";
  if (item.result.strategy === "original-kept") return "图片可能已经被优化过，已保留原图";
  return `${formatBytes(item.result.originalSize)} -> ${formatBytes(item.result.compressedSize)}`;
}

function outputFormat(item: CompressFileItem) {
  return item.result?.extension.toUpperCase() || item.mimeType.replace("image/", "").toUpperCase();
}

function dimensionsText(item: CompressFileItem) {
  return item.width && item.height ? `${item.width} x ${item.height}` : "读取尺寸中";
}

function outputDimensionsText(item: CompressFileItem) {
  const width = item.result?.width ?? item.targetWidth ?? item.width;
  const height = item.result?.height ?? item.targetHeight ?? item.height;
  return width && height ? `${width} x ${height}` : "-";
}

function updateTargetWidth(item: CompressFileItem, value: number | undefined) {
  if (!item.width || !item.height || !value) return;
  const width = Math.max(1, Math.round(value));
  item.targetWidth = width;
  item.targetHeight = Math.max(1, Math.round((width * item.height) / item.width));
}

function updateTargetHeight(item: CompressFileItem, value: number | undefined) {
  if (!item.width || !item.height || !value) return;
  const height = Math.max(1, Math.round(value));
  item.targetHeight = height;
  item.targetWidth = Math.max(1, Math.round((height * item.width) / item.height));
}

function resetTargetSize(item: CompressFileItem) {
  item.targetWidth = item.width;
  item.targetHeight = item.height;
}

function isResized(item: CompressFileItem) {
  return Boolean(item.width && item.height && item.targetWidth && item.targetHeight && (item.width !== item.targetWidth || item.height !== item.targetHeight));
}
</script>

<template>
  <main class="image-compressor-page">
    <input
      ref="uploadInputRef"
      class="hidden-input"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      multiple
      @change="handleInput(($event.target as HTMLInputElement).files)"
    />

    <header class="compressor-header">
      <section class="compressor-title">
        <h1>图片压缩</h1>
        <p>本地压缩 PNG、JPEG、WebP，尽量保持画质并显著减少体积</p>
      </section>
      <section class="compressor-header-actions">
        <el-button type="primary" :icon="UploadFilled" @click="openUploader">上传图片</el-button>
        <el-button :icon="VideoPlay" :disabled="!items.length || hasCompressing" @click="compressAll(options)">
          压缩全部
        </el-button>
        <el-button
          type="success"
          plain
          :icon="Download"
          :loading="isZipGenerating"
          :disabled="!hasDownloadable"
          @click="downloadZip"
        >
          下载全部
        </el-button>
        <el-button :icon="Delete" :disabled="!items.length || hasCompressing" @click="clearItems">清空列表</el-button>
      </section>
    </header>

    <section class="compressor-layout">
      <aside class="compressor-sidebar">
        <section class="tool-panel upload-panel">
          <div class="panel-title">上传图片</div>
          <button
            type="button"
            class="compressor-upload"
            :class="{ 'is-dragging': isDragging }"
            @click="openUploader"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <el-icon><UploadFilled /></el-icon>
            <strong>{{ isDragging ? "释放鼠标开始添加图片" : "拖拽图片到这里，或点击上传" }}</strong>
            <span>支持 PNG、JPEG、WebP；所有压缩都在浏览器本地完成</span>
          </button>
        </section>

        <section class="tool-panel compressor-settings">
          <div class="panel-title">压缩设置</div>
          <div class="setting-group">
            <label>压缩模式</label>
            <el-segmented v-model="options.mode" :options="modeOptions" block />
            <p>{{ compressionPresets[options.mode].description }}</p>
          </div>
          <div class="setting-row">
            <div>
              <label>允许转 WebP</label>
              <p>照片型 PNG 和 JPEG 通常更小</p>
            </div>
            <el-switch v-model="options.allowConvertToWebp" :disabled="options.preserveOriginalFormat" />
          </div>
          <div class="setting-row">
            <div>
              <label>保留原格式</label>
              <p>关闭自动转 WebP，仅压缩原格式</p>
            </div>
            <el-switch v-model="options.preserveOriginalFormat" />
          </div>
          <div class="setting-row">
            <div>
              <label>图片已优化时保留原图</label>
              <p>压缩后更大时不输出更大的文件</p>
            </div>
            <el-switch v-model="options.allowKeepOriginal" />
          </div>
          <el-alert
            title="所有压缩都在当前浏览器本地完成，不会上传服务器。"
            type="info"
            show-icon
            :closable="false"
          />
        </section>
      </aside>

      <section class="compressor-main">
        <div class="queue-toolbar">
          <div>
            <strong>已添加 {{ stats.count }} 张图片</strong>
            <span>总大小 {{ formatBytes(stats.originalTotal) }}</span>
            <span v-if="stats.downloadable">已节省 {{ formatBytes(stats.savedBytes) }} / {{ stats.savedPercent }}%</span>
          </div>
          <div class="queue-actions">
            <el-button size="small" :icon="Refresh" :disabled="!stats.failed || hasCompressing" @click="compressFailed">
              重新压缩失败项
            </el-button>
            <el-button size="small" :disabled="!items.length || hasCompressing" @click="compressAll(options)">
              重新压缩
            </el-button>
          </div>
        </div>

        <section v-if="!items.length" class="queue-empty">
          <el-empty description="还没有图片">
            <p>上传图片后会自动显示压缩结果</p>
            <el-button type="primary" :icon="UploadFilled" @click="openUploader">上传图片</el-button>
          </el-empty>
        </section>

        <section v-else class="compressor-queue">
          <article
            v-for="item in items"
            :key="item.id"
            class="compressor-file-item"
            :class="[`is-${item.status}`, item.result ? getSavedPercentClass(item.result.savedPercent) : '']"
          >
            <button type="button" class="thumb-button" @click="previewItem = item">
              <img class="compressor-file-thumb" :src="item.previewUrl" :alt="item.fileName" />
            </button>
            <div class="compressor-file-meta">
              <div class="file-heading">
                <strong :title="item.fileName">{{ item.fileName }}</strong>
                <el-tag size="small" effect="light" :type="statusMap[item.status].type">
                  {{ statusMap[item.status].label }}
                </el-tag>
              </div>
              <div class="file-subline">
                <span>{{ item.mimeType.replace("image/", "").toUpperCase() }}</span>
                <span>{{ formatBytes(item.originalSize) }}</span>
                <span>原尺寸 {{ dimensionsText(item) }}</span>
                <span v-if="isResized(item)">输出 {{ item.targetWidth }} x {{ item.targetHeight }}</span>
                <span v-if="item.result">{{ outputFormat(item) }}</span>
                <span v-if="item.result">{{ item.result.strategy }}</span>
              </div>
              <div class="resize-controls">
                <span class="resize-label">输出尺寸</span>
                <el-input-number
                  class="dimension-input"
                  :model-value="item.targetWidth"
                  :min="1"
                  :max="item.width || 20000"
                  :step="1"
                  size="small"
                  :controls="false"
                  :disabled="!item.width || item.status === 'compressing'"
                  @update:model-value="(value: number | undefined) => updateTargetWidth(item, value ?? undefined)"
                />
                <span class="dimension-separator">x</span>
                <el-input-number
                  class="dimension-input"
                  :model-value="item.targetHeight"
                  :min="1"
                  :max="item.height || 20000"
                  :step="1"
                  size="small"
                  :controls="false"
                  :disabled="!item.height || item.status === 'compressing'"
                  @update:model-value="(value: number | undefined) => updateTargetHeight(item, value ?? undefined)"
                />
                <el-button class="reset-size-button" size="small" text :disabled="!isResized(item) || item.status === 'compressing'" @click="resetTargetSize(item)">
                  还原
                </el-button>
              </div>
              <el-progress
                v-if="item.status === 'compressing'"
                :percentage="item.progress || 30"
                :show-text="false"
                :stroke-width="4"
              />
              <p class="file-message">{{ resultText(item) }}</p>
            </div>
            <div class="compressor-file-result">
              <strong v-if="item.result" class="saved-percent" :class="getSavedPercentClass(item.result.savedPercent)">
                {{ item.result.strategy === "original-kept" ? "已接近最优" : `节省 ${item.result.savedPercent}%` }}
              </strong>
              <strong v-else class="saved-percent is-neutral">待处理</strong>
              <span v-if="item.result">{{ formatBytes(item.result.compressedSize) }}</span>
              <span>{{ outputDimensionsText(item) }}</span>
              <div class="file-actions">
                <el-button
                  size="small"
                  :icon="VideoPlay"
                  :loading="item.status === 'compressing'"
                  @click="compressOne(item, options)"
                />
                <el-button size="small" :icon="Download" :disabled="!item.result" @click="downloadOne(item)" />
                <el-button size="small" :icon="Delete" @click="removeItem(item.id)" />
              </div>
            </div>
          </article>
        </section>
      </section>

      <aside class="compressor-inspector">
        <section class="tool-panel stats-card">
          <div class="panel-title">统计</div>
          <div class="stats-grid">
            <div>
              <strong>{{ stats.count }}</strong>
              <span>图片数量</span>
            </div>
            <div>
              <strong>{{ stats.completed }}</strong>
              <span>已完成</span>
            </div>
            <div>
              <strong>{{ stats.failed }}</strong>
              <span>失败</span>
            </div>
            <div>
              <strong>{{ stats.savedPercent }}%</strong>
              <span>总节省</span>
            </div>
          </div>
          <dl class="size-stats">
            <div>
              <dt>原始总大小</dt>
              <dd>{{ formatBytes(stats.originalTotal) }}</dd>
            </div>
            <div>
              <dt>压缩后总大小</dt>
              <dd>{{ formatBytes(actualCompressedTotal) }}</dd>
            </div>
            <div>
              <dt>总节省体积</dt>
              <dd>{{ formatBytes(stats.savedBytes) }}</dd>
            </div>
          </dl>
        </section>

        <section class="tool-panel batch-card">
          <div class="panel-title">批量操作</div>
          <el-button type="primary" :disabled="!items.length || hasCompressing" @click="compressAll(options)">
            压缩全部
          </el-button>
          <el-button type="primary" plain :loading="isZipGenerating" :disabled="!hasDownloadable" @click="downloadZip">
            下载全部 ZIP
          </el-button>
          <el-button :disabled="!stats.failed || hasCompressing" @click="compressFailed">重新压缩失败项</el-button>
          <el-button :disabled="!items.length || hasCompressing" @click="clearItems">清空列表</el-button>
          <div class="zip-note">
            <strong>下载内容</strong>
            <span>compressed-images.zip</span>
            <span>/images</span>
            <span v-if="stats.downloadable">共 {{ stats.downloadable }} 张，预计 ZIP 大小约 {{ formatBytes(stats.compressedTotal) }}</span>
          </div>
        </section>

        <section class="tool-panel policy-card">
          <div class="panel-title">当前策略</div>
          <p>当前模式：{{ compressionPresets[options.mode].label }}</p>
          <p>允许转 WebP：{{ options.allowConvertToWebp && !options.preserveOriginalFormat ? "开启" : "关闭" }}</p>
          <p>图片更大时：{{ options.allowKeepOriginal ? "保留原图" : "允许输出" }}</p>
        </section>
      </aside>
    </section>

    <footer class="compressor-statusbar">
      <span>{{ notice }}</span>
      <span>Worker 并发 2</span>
      <span>本地 WASM 编码</span>
    </footer>

    <el-dialog v-model="previewVisible" title="图片浏览" width="min(980px, 92vw)" class="preview-dialog">
      <section v-if="previewItem" class="preview-layout">
        <div class="preview-pane">
          <div class="preview-title">
            <strong>原图</strong>
            <span>{{ dimensionsText(previewItem) }} / {{ formatBytes(previewItem.originalSize) }}</span>
          </div>
          <img :src="previewItem.previewUrl" :alt="previewItem.fileName" />
        </div>
        <div class="preview-pane">
          <div class="preview-title">
            <strong>输出</strong>
            <span>{{ outputDimensionsText(previewItem) }} / {{ previewItem.result ? formatBytes(previewItem.result.compressedSize) : "待压缩" }}</span>
          </div>
          <img :src="previewItem.outputUrl || previewItem.previewUrl" :alt="previewItem.fileName" />
        </div>
      </section>
      <template #footer>
        <el-button v-if="previewItem" :disabled="!previewItem.result" @click="downloadOne(previewItem)">下载当前图片</el-button>
        <el-button type="primary" @click="previewItem = null">关闭</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.image-compressor-page {
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr) 30px;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--app-bg);
}

.compressor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--app-border);
  padding: 0 16px;
  background: #fff;
}

.compressor-title h1 {
  margin: 0 0 4px;
  color: var(--app-text);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
}

.compressor-title p {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.compressor-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.compressor-header-actions :deep(.el-button) {
  height: 30px;
  margin-left: 0;
  padding: 0 10px;
  font-size: 12px;
}

.compressor-header-actions :deep(.el-button .el-icon) {
  margin-right: 4px;
}

.compressor-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 310px;
  gap: 12px;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.compressor-sidebar,
.compressor-inspector,
.compressor-main {
  min-width: 0;
  min-height: 0;
}

.compressor-sidebar,
.compressor-inspector {
  display: grid;
  align-content: start;
  gap: 12px;
  overflow: auto;
}

.tool-panel {
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  padding: 14px;
  background: #fff;
  box-shadow: var(--app-shadow-sm);
}

.panel-title {
  margin-bottom: 12px;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 600;
}

.compressor-upload {
  display: grid;
  place-items: center;
  gap: 10px;
  width: 100%;
  min-height: 174px;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 18px;
  background: #fbfdff;
  color: var(--app-text);
  text-align: center;
  cursor: pointer;
}

.compressor-upload:hover,
.compressor-upload.is-dragging {
  border-color: var(--app-primary);
  background: #e6f4ff;
}

.compressor-upload .el-icon {
  color: var(--app-primary);
  font-size: 32px;
}

.compressor-upload strong {
  font-size: 14px;
  font-weight: 600;
}

.compressor-upload span,
.setting-group p,
.setting-row p {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.compressor-settings {
  display: grid;
  gap: 14px;
}

.setting-group,
.setting-row {
  border-bottom: 1px solid var(--app-border-light);
  padding-bottom: 12px;
}

.setting-group {
  display: grid;
  gap: 8px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

label {
  display: block;
  margin-bottom: 4px;
  color: var(--app-text-regular);
  font-size: 13px;
  font-weight: 500;
}

.compressor-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: var(--app-shadow-sm);
}

.queue-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--app-border-light);
  padding: 12px 14px;
}

.queue-toolbar > div:first-child {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.queue-toolbar strong {
  color: var(--app-text);
}

.queue-actions {
  display: flex;
  gap: 8px;
}

.queue-empty {
  display: grid;
  place-items: center;
  min-height: 0;
}

.queue-empty p {
  margin: 0 0 12px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.compressor-queue {
  display: grid;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.compressor-file-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr) 136px;
  gap: 12px;
  border: 1px solid var(--app-border-light);
  border-left: 3px solid transparent;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.compressor-file-item:hover {
  background: #fafafa;
}

.compressor-file-item.is-success {
  border-left-color: #16a34a;
}

.compressor-file-item.is-compressing {
  border-left-color: var(--app-primary);
}

.compressor-file-item.is-failed {
  border-left-color: #ef4444;
}

.thumb-button {
  width: 56px;
  height: 56px;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
}

.compressor-file-thumb {
  width: 56px;
  height: 56px;
  border: 1px solid var(--app-border-light);
  border-radius: 6px;
  object-fit: cover;
  background: #f7f8fa;
}

.compressor-file-meta {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.file-heading,
.file-subline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.file-actions :deep(.el-button) {
  width: 32px;
  min-width: 32px;
  height: 32px;
  margin-left: 0;
  padding: 0;
}

.file-heading strong {
  overflow: hidden;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-subline {
  flex-wrap: wrap;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.resize-controls {
  display: grid;
  grid-template-columns: auto 96px auto 96px auto;
  align-items: center;
  justify-content: start;
  gap: 6px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.dimension-input {
  width: 96px;
}

.dimension-input :deep(.el-input__wrapper) {
  height: 28px;
  min-height: 28px;
  border-radius: 6px;
  padding: 0 8px;
  box-shadow: 0 0 0 1px var(--app-border) inset;
}

.dimension-input :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c9d6e8 inset;
}

.dimension-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgb(22 119 255 / 10%);
}

.dimension-input :deep(.el-input__inner) {
  height: 28px;
  color: var(--app-text);
  font-size: 12px;
  line-height: 28px;
  text-align: left;
}

.dimension-input.is-disabled :deep(.el-input__wrapper) {
  background: #f7f8fa;
}

.resize-label {
  white-space: nowrap;
}

.dimension-separator {
  color: var(--app-text-placeholder);
}

.reset-size-button {
  min-width: 34px;
  padding: 0 4px;
}

.file-message {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.compressor-file-result {
  display: grid;
  justify-items: end;
  align-content: center;
  gap: 6px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.saved-percent {
  font-size: 15px;
  font-weight: 700;
}

.is-excellent {
  color: #16a34a;
}

.is-good {
  color: var(--app-primary);
}

.is-modest {
  color: #f59e0b;
}

.is-neutral {
  color: var(--app-text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  overflow: hidden;
}

.stats-grid div {
  display: grid;
  gap: 4px;
  border-right: 1px solid var(--app-border-light);
  border-bottom: 1px solid var(--app-border-light);
  padding: 12px;
}

.stats-grid div:nth-child(2n) {
  border-right: 0;
}

.stats-grid div:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.stats-grid strong {
  color: var(--app-text);
  font-size: 22px;
  font-weight: 600;
}

.stats-grid span,
.zip-note span,
.policy-card p {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.size-stats {
  display: grid;
  gap: 10px;
  margin: 14px 0 0;
}

.size-stats div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--app-border-light);
  padding-top: 10px;
}

.size-stats dt,
.size-stats dd {
  margin: 0;
  font-size: 12px;
}

.size-stats dt {
  color: var(--app-text-secondary);
}

.size-stats dd {
  color: var(--app-text);
  font-weight: 600;
}

.batch-card {
  display: grid;
  gap: 10px;
}

.batch-card :deep(.el-button) {
  width: 100%;
  margin-left: 0;
}

.zip-note {
  display: grid;
  gap: 4px;
  border-top: 1px solid var(--app-border-light);
  padding-top: 10px;
}

.zip-note strong {
  color: var(--app-text);
  font-size: 12px;
}

.policy-card p {
  margin: 8px 0 0;
}

.compressor-statusbar {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 30px;
  overflow: hidden;
  border-top: 1px solid var(--app-border);
  padding: 0 12px;
  background: #fff;
  color: var(--app-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.preview-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.preview-pane {
  display: grid;
  grid-template-rows: auto minmax(220px, 52vh);
  gap: 10px;
  min-width: 0;
}

.preview-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.preview-title strong {
  color: var(--app-text);
  font-size: 13px;
}

.preview-pane img {
  width: 100%;
  height: 100%;
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  object-fit: contain;
  background:
    linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
    linear-gradient(-45deg, transparent 75%, #f3f4f6 75%);
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

@media (max-width: 1180px) {
  .compressor-layout {
    grid-template-columns: 260px minmax(440px, 1fr);
    overflow: auto;
  }

  .compressor-inspector {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: visible;
  }
}

@media (max-width: 820px) {
  .image-compressor-page {
    grid-template-rows: auto minmax(0, 1fr) 30px;
  }

  .compressor-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px;
  }

  .compressor-header-actions {
    flex-wrap: wrap;
  }

  .compressor-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .compressor-inspector {
    grid-template-columns: minmax(0, 1fr);
  }

  .compressor-file-item {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .resize-controls {
    grid-template-columns: auto 90px auto 90px auto;
  }

  .compressor-file-result {
    grid-column: 1 / -1;
    justify-items: start;
  }

  .preview-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
