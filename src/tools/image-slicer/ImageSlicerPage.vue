<script setup lang="ts">
import { computed, ref } from "vue";
import CanvasStage from "./components/CanvasStage.vue";
import ExportPanel from "./components/ExportPanel.vue";
import SliceList from "./components/SliceList.vue";
import SliceToolbar from "./components/SliceToolbar.vue";
import UploadPanel from "./components/UploadPanel.vue";
import { autoSliceByWhitespace, sliceByFixedSize, sliceByGrid } from "./core/autoSlice";
import { cropImageToBlob } from "./core/crop";
import { downloadBlob, exportSlicesToZip } from "./core/exportZip";
import { getImageData, loadImageFromClipboard, loadImageFromFile } from "./core/imageUtils";
import { generateSliceFileName } from "./core/naming";
import { useSlices } from "./hooks/useSlices";
import type {
  ExportOptions,
  FixedSliceOptions,
  DrawOptions,
  GuideLine,
  GridOptions,
  ImageState,
  SliceRect,
  ToolMode,
  WhitespaceSliceOptions
} from "./types";

const mode = ref<ToolMode>("draw");
const imageState = ref<ImageState | null>(null);
const uploadInputRef = ref<HTMLInputElement | null>(null);
const stageRef = ref<InstanceType<typeof CanvasStage> | null>(null);
const mousePoint = ref<{ x: number; y: number } | null>(null);
const isExporting = ref(false);
const statusMessage = ref("上传图片后开始切图");
const guides = ref<GuideLine[]>([]);
const snapEnabled = ref(true);
const leftPanelCollapsed = ref(false);
const rightPanelCollapsed = ref(false);

const {
  slices,
  undoStack,
  redoStack,
  selectedSlices,
  addSlice,
  updateSlice,
  setSlices,
  selectSlice,
  clearSelection,
  deleteSelected,
  deleteSlice,
  clearSlices,
  duplicateSelected,
  undo,
  redo
} = useSlices();

const gridOptions = ref<GridOptions>({
  rows: 2,
  cols: 3,
  gapX: 0,
  gapY: 0,
  padding: 0
});

const fixedOptions = ref<FixedSliceOptions>({
  sliceWidth: 320,
  sliceHeight: 180,
  startX: 0,
  startY: 0,
  trimIncomplete: false
});

const drawOptions = ref<DrawOptions>({
  fixedSizeEnabled: false,
  fixedWidth: 320,
  fixedHeight: 180
});

const whitespaceOptions = ref<WhitespaceSliceOptions>({
  threshold: 12,
  minWidth: 16,
  minHeight: 16,
  mergeGap: 2
});

const exportOptions = ref<ExportOptions>({
  format: "jpg",
  quality: 1,
  scale: 1,
  includeManifest: false,
  includeReadme: false,
  includeCodeSnippets: false,
  zipName: "image-slices.zip",
  fileNameTemplate: "{prefix}-{index}",
  prefix: "slice"
});

const hasImage = computed(() => Boolean(imageState.value));
const zoomPercent = computed(() => Math.round((imageState.value?.scale ?? 1) * 100));

async function loadFile(file: File) {
  try {
    const image = await loadImageFromFile(file);
    imageState.value = {
      fileName: file.name,
      width: image.naturalWidth,
      height: image.naturalHeight,
      imageElement: image,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    };
    setSlices([], false);
    guides.value = [];
    statusMessage.value = `已载入 ${file.name}，尺寸 ${image.naturalWidth} x ${image.naturalHeight}`;
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : "图片载入失败";
  }
}

async function pasteImage() {
  try {
    const file = await loadImageFromClipboard();
    if (!file) {
      statusMessage.value = "剪贴板中没有图片";
      return;
    }
    await loadFile(file);
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : "读取剪贴板失败";
  }
}

function applyGrid() {
  const image = imageState.value;
  if (!image) return;
  const next = sliceByGrid(image.width, image.height, gridOptions.value);
  setSlices(next.map((slice, index) => ({ ...slice, selected: index === 0 })));
  statusMessage.value = `已生成 ${next.length} 个网格切片`;
}

function applyFixed() {
  const image = imageState.value;
  if (!image) return;
  const next = sliceByFixedSize(image.width, image.height, fixedOptions.value);
  setSlices(next.map((slice, index) => ({ ...slice, selected: index === 0 })));
  statusMessage.value = `已生成 ${next.length} 个固定尺寸切片`;
}

function applyWhitespace() {
  const image = imageState.value;
  if (!image) return;
  const imageData = getImageData(image.imageElement);
  const next = autoSliceByWhitespace(imageData, whitespaceOptions.value);
  setSlices(next.map((slice, index) => ({ ...slice, selected: index === 0 })));
  statusMessage.value = `空白分割生成 ${next.length} 个切片`;
}

function updateTransform(patch: Partial<Pick<ImageState, "scale" | "offsetX" | "offsetY">>) {
  if (!imageState.value) return;
  imageState.value = { ...imageState.value, ...patch };
}

function zoomBy(factor: number) {
  if (!imageState.value) return;
  const next = Math.min(8, Math.max(0.05, Number((imageState.value.scale * factor).toFixed(3))));
  updateTransform({ scale: next });
}

function setZoomPercent(percent: number) {
  if (!imageState.value) return;
  const next = Math.min(8, Math.max(0.05, Number((percent / 100).toFixed(3))));
  updateTransform({ scale: next });
}

function addGuideAt(guide: GuideLine) {
  guides.value = [...guides.value, guide];
  statusMessage.value = guide.axis === "x" ? "已添加竖辅助线，可拖动调整位置" : "已添加横辅助线，可拖动调整位置";
}

function updateGuide(id: string, position: number) {
  guides.value = guides.value.map(guide => (guide.id === id ? { ...guide, position } : guide));
}

function deleteGuide(id: string) {
  guides.value = guides.value.filter(guide => guide.id !== id);
  statusMessage.value = "已删除辅助线";
}

function clearGuides() {
  guides.value = [];
  statusMessage.value = "已清空辅助线";
}

function updateExportOptions(patch: Partial<ExportOptions>) {
  exportOptions.value = { ...exportOptions.value, ...patch };
}

function updateGridOptions(patch: Partial<GridOptions>) {
  gridOptions.value = { ...gridOptions.value, ...patch };
}

function updateFixedOptions(patch: Partial<FixedSliceOptions>) {
  fixedOptions.value = { ...fixedOptions.value, ...patch };
}

function updateDrawOptions(patch: Partial<DrawOptions>) {
  drawOptions.value = { ...drawOptions.value, ...patch };
}

function updateWhitespaceOptions(patch: Partial<WhitespaceSliceOptions>) {
  whitespaceOptions.value = { ...whitespaceOptions.value, ...patch };
}

async function exportZip() {
  const image = imageState.value?.imageElement;
  if (!image || !slices.value.length) {
    statusMessage.value = "请先载入图片并创建至少一个切片";
    return;
  }
  isExporting.value = true;
  statusMessage.value = "正在生成 ZIP...";
  try {
    const blob = await exportSlicesToZip(image, slices.value, exportOptions.value);
    downloadBlob(blob, exportOptions.value.zipName || "image-slices.zip");
    statusMessage.value = `已导出 ${slices.value.length} 个切片`;
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : "导出失败";
  } finally {
    isExporting.value = false;
  }
}

async function exportOne(slice: SliceRect) {
  const image = imageState.value?.imageElement;
  if (!image) return;
  try {
    const blob = await cropImageToBlob(image, slice, exportOptions.value);
    downloadBlob(blob, generateSliceFileName(slice, 0, exportOptions.value));
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : "单独导出失败";
  }
}

async function exportSelected() {
  const image = imageState.value?.imageElement;
  const selected = selectedSlices.value;
  if (!image || !selected.length) {
    statusMessage.value = "请先选择一个切片区域";
    return;
  }

  if (selected.length === 1) {
    await exportOne(selected[0]);
    statusMessage.value = `已导出选中区域 ${selected[0].name}`;
    return;
  }

  isExporting.value = true;
  statusMessage.value = "正在导出选中区域...";
  try {
    const blob = await exportSlicesToZip(image, selected, exportOptions.value);
    downloadBlob(blob, exportOptions.value.zipName || "selected-slices.zip");
    statusMessage.value = `已导出 ${selected.length} 个选中切片`;
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : "导出选中区域失败";
  } finally {
    isExporting.value = false;
  }
}

function handleUploadInput(files: FileList | null) {
  const file = files?.[0];
  if (file) {
    void loadFile(file);
  }
  if (uploadInputRef.value) {
    uploadInputRef.value.value = "";
  }
}

function onUpdateSlice(id: string, patch: Partial<SliceRect>, snapshot = true) {
  updateSlice(id, patch, snapshot);
}

function toggleSliceLock(id: string) {
  const slice = slices.value.find(item => item.id === id);
  if (!slice) {
    return;
  }
  updateSlice(id, { locked: !slice.locked });
  statusMessage.value = slice.locked ? "已解锁切片区域" : "已锁定切片区域，画布中无法选中";
}

function clearSliceList() {
  clearSlices();
  statusMessage.value = "已清空切图列表";
}

function clearAllWorkspace() {
  imageState.value = null;
  setSlices([], false);
  guides.value = [];
  mousePoint.value = null;
  mode.value = "draw";
  statusMessage.value = "已清空图片和所有切片";
  if (uploadInputRef.value) {
    uploadInputRef.value.value = "";
  }
}

function onAddSlice(slice: SliceRect) {
  addSlice(slice);
  statusMessage.value = "已创建区域切片，可继续按住拖拽选择新区域";
}
</script>

<template>
  <main class="image-slicer-page">
    <input
      ref="uploadInputRef"
      class="hidden-input"
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif"
      @change="handleUploadInput(($event.target as HTMLInputElement).files)"
    />

    <SliceToolbar
      :mode="mode"
      :can-undo="undoStack.length > 0"
      :can-redo="redoStack.length > 0"
      :has-image="hasImage"
      :has-selected-slice="selectedSlices.length > 0"
      :guide-count="guides.length"
      :snap-enabled="snapEnabled"
      :zoom-percent="zoomPercent"
      :export-options="exportOptions"
      :is-exporting="isExporting"
      :left-panel-collapsed="leftPanelCollapsed"
      :right-panel-collapsed="rightPanelCollapsed"
      @set-mode="mode = $event"
      @upload-click="uploadInputRef?.click()"
      @paste="pasteImage"
      @clear-guides="clearGuides"
      @toggle-snap="snapEnabled = !snapEnabled"
      @undo="undo"
      @redo="redo"
      @zoom-in="zoomBy(1.15)"
      @zoom-out="zoomBy(0.85)"
      @zoom-set="setZoomPercent"
      @reset-view="stageRef?.fitImage()"
      @export-selected="exportSelected"
      @export-zip="exportZip"
      @clear-all="clearAllWorkspace"
      @toggle-left-panel="leftPanelCollapsed = !leftPanelCollapsed"
      @toggle-right-panel="rightPanelCollapsed = !rightPanelCollapsed"
      @update-export-options="updateExportOptions"
    />

    <section
      class="workspace"
      :class="{
        'is-left-collapsed': leftPanelCollapsed,
        'is-right-collapsed': rightPanelCollapsed
      }"
    >
      <ExportPanel
        class="workspace-left-panel"
        :export-options="exportOptions"
        :grid-options="gridOptions"
        :fixed-options="fixedOptions"
        :draw-options="drawOptions"
        :whitespace-options="whitespaceOptions"
        :disabled="!hasImage"
        :is-exporting="isExporting"
        @update-export-options="updateExportOptions"
        @update-grid-options="updateGridOptions"
        @update-fixed-options="updateFixedOptions"
        @update-draw-options="updateDrawOptions"
        @update-whitespace-options="updateWhitespaceOptions"
        @grid="applyGrid"
        @fixed="applyFixed"
        @whitespace="applyWhitespace"
        @export-zip="exportZip"
      />

      <section class="center">
        <UploadPanel v-if="!hasImage" class="floating-upload" @upload="loadFile" @paste="pasteImage" />
        <CanvasStage
          ref="stageRef"
          :image-state="imageState"
          :slices="slices"
          :guides="guides"
          :mode="mode"
          :snap-enabled="snapEnabled"
          :draw-options="drawOptions"
          @add-slice="onAddSlice"
          @update-slice="onUpdateSlice"
          @select-slice="selectSlice"
          @clear-selection="clearSelection"
          @delete-selected="deleteSelected"
          @duplicate-selected="duplicateSelected"
          @undo="undo"
          @redo="redo"
          @add-guide="addGuideAt"
          @update-guide="updateGuide"
          @delete-guide="deleteGuide"
          @transform-change="updateTransform"
          @mouse-position="mousePoint = $event"
        />
      </section>

      <SliceList
        class="workspace-right-panel"
        :slices="slices"
        :image="imageState?.imageElement ?? null"
        :export-options="exportOptions"
        @select="selectSlice"
        @rename="(id, name) => updateSlice(id, { name })"
        @toggle-lock="toggleSliceLock"
        @delete="deleteSlice"
        @clear-all="clearSliceList"
        @duplicate="duplicateSelected"
        @export-one="exportOne"
      />
    </section>

    <footer class="statusbar">
      <span>{{ statusMessage }}</span>
      <span v-if="imageState">图片 {{ imageState.width }} x {{ imageState.height }}</span>
      <span v-if="mousePoint">坐标 {{ mousePoint.x }}, {{ mousePoint.y }}</span>
      <span>缩放 {{ zoomPercent }}%</span>
      <span>{{ mode === "draw" ? "区域切图模式" : "选择模式" }}</span>
      <span v-if="guides.length">辅助线 {{ guides.length }} 条{{ snapEnabled ? "，吸附开启" : "，吸附关闭" }}</span>
    </footer>
  </main>
</template>
