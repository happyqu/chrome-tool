<script setup lang="ts">
import {
  Aim,
  Download,
  FullScreen,
  RefreshLeft,
  RefreshRight,
  Delete,
  ZoomIn,
  ZoomOut
} from "@element-plus/icons-vue";
import { ElButton, ElPopover, ElTooltip } from "element-plus";
import type { ExportOptions, ToolMode } from "../types";

defineProps<{
  mode: ToolMode;
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
  hasSelectedSlice: boolean;
  guideCount: number;
  snapEnabled: boolean;
  zoomPercent: number;
  exportOptions: ExportOptions;
  isExporting: boolean;
}>();

const emit = defineEmits<{
  setMode: [mode: ToolMode];
  uploadClick: [];
  paste: [];
  clearGuides: [];
  toggleSnap: [];
  undo: [];
  redo: [];
  zoomIn: [];
  zoomOut: [];
  resetView: [];
  exportSelected: [];
  exportZip: [];
  clearAll: [];
  updateExportOptions: [patch: Partial<ExportOptions>];
}>();

function numberValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-title">
      <strong>图片切图工具</strong>
      <span>自动分割 / 手动裁剪 / ZIP 导出</span>
    </div>

    <div class="toolbar-center">
      <div class="group">
        <ElButton text :disabled="!hasImage || guideCount === 0" @click="emit('clearGuides')">清空辅助线</ElButton>
        <ElButton :icon="Aim" :type="snapEnabled ? 'primary' : 'default'" :disabled="!hasImage" plain @click="emit('toggleSnap')">吸附</ElButton>
      </div>
      <div class="group icon-group">
        <ElTooltip content="撤销 Ctrl+Z" placement="bottom">
          <ElButton :icon="RefreshLeft" :disabled="!canUndo" circle @click="emit('undo')" />
        </ElTooltip>
        <ElTooltip content="重做 Ctrl+Shift+Z" placement="bottom">
          <ElButton :icon="RefreshRight" :disabled="!canRedo" circle @click="emit('redo')" />
        </ElTooltip>
      </div>
      <div class="group icon-group">
        <ElButton :icon="ZoomOut" :disabled="!hasImage" circle @click="emit('zoomOut')" />
        <span class="zoom">{{ zoomPercent }}%</span>
        <ElButton :icon="ZoomIn" :disabled="!hasImage" circle @click="emit('zoomIn')" />
        <ElTooltip content="重置视图" placement="bottom">
          <ElButton :icon="FullScreen" :disabled="!hasImage" circle @click="emit('resetView')" />
        </ElTooltip>
      </div>
    </div>

    <div class="export-actions">
      <ElPopover placement="bottom-end" :width="340" trigger="click" popper-class="export-settings-popover">
        <template #reference>
          <ElButton :icon="Download" plain :disabled="!hasImage">导出设置</ElButton>
        </template>
        <div class="export-popover">
          <div class="popover-head">
            <h3>导出设置</h3>
            <span>格式、命名和附加文件</span>
          </div>
          <div class="form-grid">
            <label>格式
              <select :value="exportOptions.format" @change="emit('updateExportOptions', { format: ($event.target as HTMLSelectElement).value as ExportOptions['format'] })">
                <option value="webp">webp</option>
                <option value="png">png</option>
                <option value="jpg">jpg</option>
                <option value="jpeg">jpeg</option>
              </select>
            </label>
            <label>倍率
              <select :value="exportOptions.scale" @change="emit('updateExportOptions', { scale: Number(($event.target as HTMLSelectElement).value) as ExportOptions['scale'] })">
                <option :value="1">1x</option>
                <option :value="2">2x</option>
                <option :value="3">3x</option>
              </select>
            </label>
          </div>
          <label>质量 {{ Math.round(exportOptions.quality * 100) }}%
            <input type="range" min="0.1" max="1" step="0.05" :value="exportOptions.quality" @input="emit('updateExportOptions', { quality: numberValue($event) })" />
          </label>
          <label>命名前缀
            <input :value="exportOptions.prefix" @input="emit('updateExportOptions', { prefix: ($event.target as HTMLInputElement).value })" />
          </label>
          <label>命名模板
            <input :value="exportOptions.fileNameTemplate" @input="emit('updateExportOptions', { fileNameTemplate: ($event.target as HTMLInputElement).value })" />
          </label>
          <label>ZIP 名称
            <input :value="exportOptions.zipName" @input="emit('updateExportOptions', { zipName: ($event.target as HTMLInputElement).value })" />
          </label>
          <div class="export-extra-options">
            <div class="checkbox-list">
              <label class="checkbox-row">
                <input type="checkbox" :checked="exportOptions.includeManifest" @change="emit('updateExportOptions', { includeManifest: ($event.target as HTMLInputElement).checked })" />
                <span>manifest</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="exportOptions.includeCodeSnippets" @change="emit('updateExportOptions', { includeCodeSnippets: ($event.target as HTMLInputElement).checked })" />
                <span>代码片段</span>
              </label>
              <label class="checkbox-row">
                <input type="checkbox" :checked="exportOptions.includeReadme" @change="emit('updateExportOptions', { includeReadme: ($event.target as HTMLInputElement).checked })" />
                <span>README</span>
              </label>
            </div>
          </div>
          <ElButton class="popover-export" type="primary" :icon="Download" :disabled="!hasImage || isExporting" @click="emit('exportZip')">
            {{ isExporting ? "导出中..." : "导出 ZIP" }}
          </ElButton>
        </div>
      </ElPopover>
      <ElButton :icon="Download" :disabled="!hasSelectedSlice" plain @click="emit('exportSelected')">导出选中</ElButton>
      <ElButton :icon="Download" type="primary" :disabled="!hasImage || isExporting" @click="emit('exportZip')">{{ isExporting ? "导出中" : "导出 ZIP" }}</ElButton>
      <ElButton :icon="Delete" type="danger" text :disabled="!hasImage" @click="emit('clearAll')">清空</ElButton>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--app-border);
  background: #fff;
  overflow-x: auto;
  box-shadow: none;
}

.toolbar-title {
  display: grid;
  gap: 2px;
  min-width: 230px;
}

.toolbar-title strong {
  color: var(--app-text);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}

.toolbar-title span {
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.2;
}

.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 8px 0 0;
  border-right: 1px solid var(--app-border-light);
}

.icon-group {
  gap: 7px;
}

.export-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.zoom {
  min-width: 48px;
  border: 0;
  border-radius: 6px;
  padding: 3px 6px;
  background: #f5f7fa;
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
}

:deep(.el-button) {
  min-height: 32px;
  border-radius: 6px;
  font-weight: 500;
  letter-spacing: 0;
  box-shadow: none;
}

:deep(.el-button.is-circle) {
  width: 32px;
  min-height: 32px;
}

:deep(.el-button--primary) {
  box-shadow: none;
}

:deep(.el-button-group .el-button) {
  min-width: 78px;
}

.export-popover {
  display: grid;
  gap: 10px;
}

.popover-head h3 {
  margin: 0;
  color: var(--app-text);
  font-size: 15px;
}

.popover-head span {
  display: block;
  margin-top: 3px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.export-popover label {
  display: grid;
  gap: 5px;
  color: #526075;
  font-size: 12px;
  font-weight: 700;
}

.export-popover input,
.export-popover select {
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 6px 8px;
  background: white;
  color: #1d2a42;
  font-size: 12px;
}

.export-popover input[type="range"] {
  padding: 0;
}

.export-extra-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
  border-top: 1px solid var(--app-border-light);
  border-bottom: 1px solid var(--app-border-light);
  padding: 8px 0;
}

.extra-label {
  flex: 0 0 auto;
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.checkbox-list {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;
}

.export-popover .checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  min-height: 22px;
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}

.export-popover .checkbox-row input {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  accent-color: var(--app-primary);
}

.export-popover .checkbox-row span {
  display: inline-block;
  line-height: 1;
}

.popover-export {
  width: 100%;
}

@media (max-width: 1280px) {
  .toolbar-title {
    min-width: 180px;
  }

  .toolbar {
    gap: 10px;
    padding-inline: 12px;
  }

  .group {
    padding-right: 9px;
  }
}
</style>
