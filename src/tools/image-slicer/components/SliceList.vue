<script setup lang="ts">
import { ref } from "vue";
import { CopyDocument, Delete, DeleteFilled, Download, Lock, Unlock, ZoomIn } from "@element-plus/icons-vue";
import { ElButton, ElDialog, ElIcon, ElInput, ElTooltip } from "element-plus";
import type { ExportOptions, SliceRect } from "../types";
import SlicePreview from "./SlicePreview.vue";

const emit = defineEmits<{
  select: [id: string, additive?: boolean];
  rename: [id: string, name: string];
  toggleLock: [id: string];
  delete: [id: string];
  clearAll: [];
  duplicate: [];
  exportOne: [slice: SliceRect];
}>();

const props = defineProps<{
  slices: SliceRect[];
  image: HTMLImageElement | null;
  exportOptions: ExportOptions;
}>();

const previewDialogVisible = ref(false);
const previewDataUrl = ref("");
const previewTitle = ref("");

function openPreview(slice: SliceRect) {
  if (!props.image) {
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(slice.width));
  canvas.height = Math.max(1, Math.round(slice.height));
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  context.drawImage(
    props.image,
    Math.round(slice.x),
    Math.round(slice.y),
    canvas.width,
    canvas.height,
    0,
    0,
    canvas.width,
    canvas.height
  );
  previewDataUrl.value = canvas.toDataURL("image/png");
  previewTitle.value = `${slice.name} · ${canvas.width} x ${canvas.height}`;
  previewDialogVisible.value = true;
}
</script>

<template>
  <aside class="slice-list">
    <div class="panel-title">
      <div>
        <h2>切片列表</h2>
        <span>{{ slices.length }} 个区域</span>
      </div>
      <div class="panel-actions">
        <ElTooltip content="复制选中区域" placement="bottom">
          <ElButton size="small" :icon="CopyDocument" :disabled="!slices.some(item => item.selected)" @click="emit('duplicate')" />
        </ElTooltip>
        <ElTooltip content="清空切图列表" placement="bottom">
          <ElButton size="small" :icon="DeleteFilled" type="danger" plain :disabled="!slices.length" @click="emit('clearAll')" />
        </ElTooltip>
      </div>
    </div>

    <div v-if="!slices.length" class="empty">暂无切片。使用框选、网格或固定尺寸生成区域。</div>

    <article
      v-for="slice in slices"
      :key="slice.id"
      class="slice-item"
      :class="{ selected: slice.selected, locked: slice.locked }"
      @click="!slice.locked && emit('select', slice.id, $event.ctrlKey || $event.metaKey || $event.shiftKey)"
    >
      <button class="preview-button" type="button" :disabled="!image" @click.stop="openPreview(slice)">
        <SlicePreview :image="image" :slice="slice" />
        <span class="preview-overlay">
          <ElIcon><ZoomIn /></ElIcon>
        </span>
      </button>
      <div class="meta">
        <div class="name-row">
          <ElInput :model-value="slice.name" size="small" @update:model-value="value => emit('rename', slice.id, String(value))" />
          <span v-if="slice.locked" class="lock-badge">已锁定</span>
        </div>
        <div class="info-row">
          <span>{{ Math.round(slice.width) }} x {{ Math.round(slice.height) }} px</span>
          <span>x {{ Math.round(slice.x) }} / y {{ Math.round(slice.y) }}</span>
        </div>
      </div>
      <div class="actions">
        <ElTooltip :content="slice.locked ? '解锁区域' : '锁定区域'" placement="bottom">
          <ElButton size="small" :icon="slice.locked ? Unlock : Lock" @click.stop="emit('toggleLock', slice.id)" />
        </ElTooltip>
        <ElTooltip content="单独导出" placement="bottom">
          <ElButton size="small" :icon="Download" :disabled="!image" @click.stop="emit('exportOne', slice)" />
        </ElTooltip>
        <ElTooltip content="删除区域" placement="bottom">
          <ElButton size="small" :icon="Delete" type="danger" plain @click.stop="emit('delete', slice.id)" />
        </ElTooltip>
      </div>
    </article>

    <ElDialog v-model="previewDialogVisible" :title="previewTitle" width="min(860px, 92vw)" align-center>
      <div class="preview-dialog-body">
        <img v-if="previewDataUrl" :src="previewDataUrl" :alt="previewTitle" />
      </div>
    </ElDialog>
  </aside>
</template>

<style scoped>
.slice-list {
  display: grid;
  align-content: start;
  gap: 8px;
  height: 100%;
  overflow: auto;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: #fff;
  padding: 12px;
  box-shadow: var(--app-shadow-sm);
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 15px;
}

.panel-title span,
.meta span,
.empty {
  color: var(--app-text-secondary);
  font-size: 12px;
}

.slice-item {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid var(--app-border-light);
  border-radius: 8px;
  min-height: 82px;
  padding: 9px;
  background: white;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    box-shadow 140ms ease,
    transform 140ms ease;
}

.slice-item:hover {
  border-color: #c9d6e8;
  box-shadow: none;
}

.slice-item.selected {
  border-color: #91caff;
  background: #e6f4ff;
  box-shadow: inset 3px 0 0 #1677ff;
}

.slice-item.locked {
  opacity: 0.72;
}

.meta {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.name-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}

.info-row span {
  line-height: 1.2;
}

.lock-badge {
  border-radius: 4px;
  padding: 3px 5px;
  background: #f3f4f6;
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.actions {
  grid-column: 1 / -1;
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: flex-start;
  gap: 6px;
  align-items: center;
  padding-top: 2px;
}

.actions :deep(.el-button) {
  width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
  border-radius: 6px;
  color: var(--app-text-secondary);
}

.actions :deep(.el-button:hover) {
  background: #f3f7ff;
  color: var(--app-primary);
}

.actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.preview-button {
  position: relative;
  display: block;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: zoom-in;
}

.preview-button:disabled {
  cursor: not-allowed;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: rgb(23 32 51 / 0%);
  color: white;
  opacity: 0;
  transition:
    background 140ms ease,
    opacity 140ms ease;
}

.preview-button:hover .preview-overlay {
  background: rgb(23 32 51 / 42%);
  opacity: 1;
}

.preview-dialog-body {
  display: grid;
  place-items: center;
  max-height: 72vh;
  overflow: auto;
  background:
    linear-gradient(45deg, #e8edf5 25%, transparent 25%),
    linear-gradient(-45deg, #e8edf5 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e8edf5 75%),
    linear-gradient(-45deg, transparent 75%, #e8edf5 75%);
  background-color: #f8fafc;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
  background-size: 20px 20px;
}

.preview-dialog-body img {
  display: block;
  max-width: 100%;
  height: auto;
}
</style>
