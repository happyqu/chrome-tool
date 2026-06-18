<script setup lang="ts">
import { ref } from "vue";
import { ElButton, ElCollapse, ElCollapseItem } from "element-plus";
import type { DrawOptions, ExportOptions, FixedSliceOptions, GridOptions, WhitespaceSliceOptions } from "../types";

defineProps<{
  exportOptions: ExportOptions;
  gridOptions: GridOptions;
  fixedOptions: FixedSliceOptions;
  drawOptions: DrawOptions;
  whitespaceOptions: WhitespaceSliceOptions;
  disabled: boolean;
  isExporting: boolean;
}>();

const emit = defineEmits<{
  updateExportOptions: [patch: Partial<ExportOptions>];
  updateGridOptions: [patch: Partial<GridOptions>];
  updateFixedOptions: [patch: Partial<FixedSliceOptions>];
  updateDrawOptions: [patch: Partial<DrawOptions>];
  updateWhitespaceOptions: [patch: Partial<WhitespaceSliceOptions>];
  grid: [];
  fixed: [];
  whitespace: [];
  exportZip: [];
}>();

function numberValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

const activePanel = ref("draw");
</script>

<template>
  <aside class="export-panel">
    <ElCollapse v-model="activePanel" class="config-collapse" accordion>
      <ElCollapseItem name="draw">
        <template #title>
          <span class="collapse-title">区域切图</span>
        </template>
        <section class="tab-section">
          <div class="section-head">
            <div>
              <h2>手动区域</h2>
              <p>控制鼠标框选时的区域尺寸</p>
            </div>
          </div>
          <label class="check"><input type="checkbox" :checked="drawOptions.fixedSizeEnabled" @change="emit('updateDrawOptions', { fixedSizeEnabled: ($event.target as HTMLInputElement).checked })" />固定选区尺寸</label>
          <div class="field-row">
            <label>选区宽<input type="number" min="1" :value="drawOptions.fixedWidth" @input="emit('updateDrawOptions', { fixedWidth: numberValue($event) })" /></label>
            <label>选区高<input type="number" min="1" :value="drawOptions.fixedHeight" @input="emit('updateDrawOptions', { fixedHeight: numberValue($event) })" /></label>
          </div>
        </section>
      </ElCollapseItem>

      <ElCollapseItem name="grid">
        <template #title>
          <span class="collapse-title">网格分割</span>
        </template>
        <section class="tab-section">
          <div class="section-head">
            <div>
              <h2>网格分割</h2>
              <p>按行列生成规则切片</p>
            </div>
          </div>
          <div class="field-row">
            <label>行数<input type="number" min="1" :value="gridOptions.rows" @input="emit('updateGridOptions', { rows: numberValue($event) })" /></label>
            <label>列数<input type="number" min="1" :value="gridOptions.cols" @input="emit('updateGridOptions', { cols: numberValue($event) })" /></label>
          </div>
          <div class="field-row">
            <label>横间距<input type="number" min="0" :value="gridOptions.gapX" @input="emit('updateGridOptions', { gapX: numberValue($event) })" /></label>
            <label>纵间距<input type="number" min="0" :value="gridOptions.gapY" @input="emit('updateGridOptions', { gapY: numberValue($event) })" /></label>
          </div>
          <label>外边距<input type="number" min="0" :value="gridOptions.padding" @input="emit('updateGridOptions', { padding: numberValue($event) })" /></label>
          <ElButton class="generate-button" type="primary" :disabled="disabled" @click="emit('grid')">生成网格切片</ElButton>
        </section>
      </ElCollapseItem>

      <ElCollapseItem name="fixed">
        <template #title>
          <span class="collapse-title">固定分割</span>
        </template>
        <section class="tab-section">
          <div class="section-head">
            <div>
              <h2>固定尺寸分割</h2>
              <p>按固定宽高从左到右切图</p>
            </div>
          </div>
          <div class="field-row">
            <label>宽度<input type="number" min="1" :value="fixedOptions.sliceWidth" @input="emit('updateFixedOptions', { sliceWidth: numberValue($event) })" /></label>
            <label>高度<input type="number" min="1" :value="fixedOptions.sliceHeight" @input="emit('updateFixedOptions', { sliceHeight: numberValue($event) })" /></label>
          </div>
          <div class="field-row">
            <label>起始 X<input type="number" min="0" :value="fixedOptions.startX" @input="emit('updateFixedOptions', { startX: numberValue($event) })" /></label>
            <label>起始 Y<input type="number" min="0" :value="fixedOptions.startY" @input="emit('updateFixedOptions', { startY: numberValue($event) })" /></label>
          </div>
          <label class="check"><input type="checkbox" :checked="fixedOptions.trimIncomplete" @change="emit('updateFixedOptions', { trimIncomplete: ($event.target as HTMLInputElement).checked })" />裁掉不足尺寸边缘</label>
          <ElButton class="generate-button" type="primary" :disabled="disabled" @click="emit('fixed')">生成固定切片</ElButton>
        </section>
      </ElCollapseItem>

      <ElCollapseItem name="whitespace">
        <template #title>
          <span class="collapse-title">空白分割</span>
        </template>
        <section class="tab-section">
          <div class="section-head">
            <div>
              <h2>空白自动分割</h2>
              <p>根据透明或白色间隔识别区域</p>
            </div>
          </div>
          <label>空白容差<input type="number" min="0" max="255" :value="whitespaceOptions.threshold" @input="emit('updateWhitespaceOptions', { threshold: numberValue($event) })" /></label>
          <div class="field-row">
            <label>最小宽<input type="number" min="1" :value="whitespaceOptions.minWidth" @input="emit('updateWhitespaceOptions', { minWidth: numberValue($event) })" /></label>
            <label>最小高<input type="number" min="1" :value="whitespaceOptions.minHeight" @input="emit('updateWhitespaceOptions', { minHeight: numberValue($event) })" /></label>
          </div>
          <label>合并距离<input type="number" min="0" :value="whitespaceOptions.mergeGap" @input="emit('updateWhitespaceOptions', { mergeGap: numberValue($event) })" /></label>
          <ElButton class="generate-button" type="primary" :disabled="disabled" @click="emit('whitespace')">生成空白切片</ElButton>
        </section>
      </ElCollapseItem>
    </ElCollapse>
  </aside>
</template>

<style scoped>
.export-panel {
  display: grid;
  align-content: start;
  grid-template-rows: minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: var(--app-card-bg);
  box-shadow: var(--app-shadow-sm);
}

.tab-section {
  display: grid;
  gap: 8px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.tab-section {
  padding: 10px;
}

.generate-button {
  width: 100%;
  margin-top: 4px;
}

.tab-section + .tab-section {
  margin-top: 10px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

h2 {
  margin: 0;
  color: var(--app-text);
  font-size: 14px;
  font-weight: 700;
}

p {
  margin: 3px 0 0;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.35;
}

label {
  display: grid;
  gap: 5px;
  color: var(--app-text-regular);
  font-size: 13px;
  font-weight: 500;
}

.field-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

input,
select {
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 6px 8px;
  background: white;
  color: var(--app-text);
  font-size: 12px;
  height: 32px;
}

input[type="range"] {
  padding: 0;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
}

.check input {
  width: auto;
}

.config-collapse {
  min-height: 0;
  border: 0;
  border-radius: 10px;
  overflow: auto;
  background: var(--app-card-bg);
}

.collapse-title {
  color: var(--app-text);
  font-size: 14px;
  font-weight: 700;
}

:deep(.el-collapse) {
  border: 0;
}

:deep(.el-collapse-item__header) {
  height: 40px;
  border-bottom-color: var(--app-border-light);
  padding: 0 12px;
  background: #fff;
}

:deep(.el-collapse-item__content) {
  max-height: calc(100vh - 210px);
  overflow: auto;
  padding: 10px 12px 12px;
  background: #fafbfc;
}

:deep(.el-collapse-item__wrap) {
  border-bottom-color: var(--app-border-light);
}
</style>
