<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { DrawOptions, GuideLine, ImageState, SliceRect, ToolMode } from "../types";
import { clamp } from "../../../shared/utils";

const props = defineProps<{
  imageState: ImageState | null;
  slices: SliceRect[];
  guides: GuideLine[];
  mode: ToolMode;
  snapEnabled: boolean;
  drawOptions: DrawOptions;
}>();

const emit = defineEmits<{
  addSlice: [slice: SliceRect];
  updateSlice: [id: string, patch: Partial<SliceRect>, snapshot?: boolean];
  selectSlice: [id: string, additive?: boolean];
  exportSlice: [slice: SliceRect];
  clearSelection: [];
  deleteSelected: [];
  duplicateSelected: [];
  undo: [];
  redo: [];
  addGuide: [guide: GuideLine];
  updateGuide: [id: string, position: number];
  deleteGuide: [id: string];
  transformChange: [patch: Partial<Pick<ImageState, "scale" | "offsetX" | "offsetY">>];
  mousePosition: [point: { x: number; y: number } | null];
}>();

type DragState =
  | { type: "draw"; startX: number; startY: number; selectOnClickId?: string }
  | { type: "move"; id: string; startX: number; startY: number; original: SliceRect }
  | { type: "resize"; id: string; handle: string; startX: number; startY: number; original: SliceRect }
  | { type: "guide"; id: string; axis: "x" | "y" }
  | { type: "pan"; startClientX: number; startClientY: number; startOffsetX: number; startOffsetY: number };

const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const dragState = ref<DragState | null>(null);
const draftSlice = ref<SliceRect | null>(null);
const spacePressed = ref(false);
const pointerInsideViewport = ref(false);
const lastViewportPointer = ref<{ x: number; y: number } | null>(null);
const sliceContextMenu = ref<{ slice: SliceRect; x: number; y: number } | null>(null);

const stageStyle = computed(() => {
  const image = props.imageState;
  if (!image) {
    return {};
  }
  return {
    width: `${image.width}px`,
    height: `${image.height}px`,
    transform: `translate(${image.offsetX}px, ${image.offsetY}px) scale(${image.scale})`
  };
});

const horizontalTicks = computed(() => makeTicks(props.imageState?.width ?? 0, "x"));
const verticalTicks = computed(() => makeTicks(props.imageState?.height ?? 0, "y"));

function makeTicks(length: number, axis: "x" | "y") {
  const image = props.imageState;
  const step = length > 2400 ? 200 : length > 900 ? 100 : 50;
  const ticks: Array<{ key: string; position: number; label: string; major: boolean; style: Record<string, string> }> = [];
  for (let position = 0; position <= length; position += step / 2) {
    const major = position % step === 0;
    const screenPosition = image
      ? axis === "x"
        ? image.offsetX + position * image.scale
        : image.offsetY + position * image.scale
      : position;
    ticks.push({
      key: `${axis}-${position}`,
      position,
      label: major ? String(position) : "",
      major,
      style: axis === "x" ? { left: `${screenPosition}px` } : { top: `${screenPosition}px` }
    });
  }
  return ticks;
}

function drawImage() {
  const canvas = canvasRef.value;
  const image = props.imageState;
  if (!canvas || !image) {
    return;
  }
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image.imageElement, 0, 0, image.width, image.height);
}

function fitImage() {
  const image = props.imageState;
  const viewport = viewportRef.value;
  if (!image || !viewport) {
    return;
  }
  const padding = 56;
  const scale = Math.min(
    1,
    (viewport.clientWidth - padding) / image.width,
    (viewport.clientHeight - padding) / image.height
  );
  const offsetX = Math.round((viewport.clientWidth - image.width * scale) / 2);
  const offsetY = Math.round((viewport.clientHeight - image.height * scale) / 2);
  emit("transformChange", { scale: Number(scale.toFixed(3)), offsetX, offsetY });
}

function clientToImagePoint(event: MouseEvent): { x: number; y: number } | null {
  const point = clientToRawImagePoint(event);
  const image = props.imageState;
  if (!point || !image) {
    return null;
  }
  return {
    x: clamp(point.x, 0, image.width),
    y: clamp(point.y, 0, image.height)
  };
}

function clientToRawImagePoint(event: MouseEvent): { x: number; y: number } | null {
  const image = props.imageState;
  const viewport = viewportRef.value;
  if (!image || !viewport) {
    return null;
  }
  const bounds = viewport.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left - image.offsetX) / image.scale,
    y: (event.clientY - bounds.top - image.offsetY) / image.scale
  };
}

function rectStyle(slice: SliceRect) {
  const scale = props.imageState?.scale ?? 1;
  return {
    left: `${slice.x}px`,
    top: `${slice.y}px`,
    width: `${slice.width}px`,
    height: `${slice.height}px`,
    "--stage-scale": String(scale),
    "--inverse-scale": String(1 / scale)
  };
}

function guideStyle(guide: GuideLine) {
  const image = props.imageState;
  if (!image) {
    return {};
  }

  if (guide.axis === "x") {
    return { left: `${image.offsetX + guide.position * image.scale}px` };
  }
  return { top: `${image.offsetY + guide.position * image.scale}px` };
}

function findSnapAnchor(
  value: number,
  axis: "x" | "y",
  excludeSliceId?: string,
  excludeGuideId?: string
): { anchor: number; distance: number } | null {
  const image = props.imageState;
  if (!image || !props.snapEnabled) {
    return null;
  }
  const threshold = 8 / image.scale;
  const sliceAnchors = props.slices
    .filter(slice => slice.id !== excludeSliceId)
    .flatMap(slice =>
      axis === "x"
        ? [slice.x, slice.x + slice.width]
        : [slice.y, slice.y + slice.height]
    );
  const anchors = [
    0,
    axis === "x" ? image.width : image.height,
    ...props.guides
      .filter(guide => guide.axis === axis && guide.id !== excludeGuideId)
      .map(guide => guide.position),
    ...sliceAnchors
  ];

  return anchors.reduce<{ anchor: number; distance: number } | null>((closest, anchor) => {
    const distance = Math.abs(anchor - value);
    if (distance > threshold) {
      return closest;
    }
    if (!closest || distance < closest.distance) {
      return { anchor, distance };
    }
    return closest;
  }, null);
}

function snapValue(value: number, axis: "x" | "y", excludeSliceId?: string, excludeGuideId?: string): number {
  const nearest = findSnapAnchor(value, axis, excludeSliceId, excludeGuideId);
  return nearest?.anchor ?? value;
}

function snapPoint(point: { x: number; y: number }, excludeSliceId?: string): { x: number; y: number } {
  return {
    x: snapValue(point.x, "x", excludeSliceId),
    y: snapValue(point.y, "y", excludeSliceId)
  };
}

function snapMovedRect(original: SliceRect, dx: number, dy: number): Pick<SliceRect, "x" | "y"> {
  const image = props.imageState;
  if (!image) {
    return { x: original.x, y: original.y };
  }
  let nextX = clamp(original.x + dx, 0, image.width - original.width);
  let nextY = clamp(original.y + dy, 0, image.height - original.height);
  const xCandidates = [
    findSnapAnchor(nextX, "x", original.id),
    findSnapAnchor(nextX + original.width, "x", original.id)
  ]
    .map((snap, index) => (snap ? { x: snap.anchor - (index === 0 ? 0 : original.width), distance: snap.distance } : null))
    .filter((snap): snap is { x: number; distance: number } => Boolean(snap));
  const yCandidates = [
    findSnapAnchor(nextY, "y", original.id),
    findSnapAnchor(nextY + original.height, "y", original.id)
  ]
    .map((snap, index) => (snap ? { y: snap.anchor - (index === 0 ? 0 : original.height), distance: snap.distance } : null))
    .filter((snap): snap is { y: number; distance: number } => Boolean(snap));

  const snappedX = xCandidates.sort((a, b) => a.distance - b.distance)[0];
  const snappedY = yCandidates.sort((a, b) => a.distance - b.distance)[0];
  if (snappedX) {
    nextX = snappedX.x;
  }
  if (snappedY) {
    nextY = snappedY.y;
  }

  return {
    x: Math.round(clamp(nextX, 0, image.width - original.width)),
    y: Math.round(clamp(nextY, 0, image.height - original.height))
  };
}

function makeSlice(x: number, y: number, width: number, height: number): SliceRect {
  return {
    id: crypto.randomUUID(),
    name: `slice-${String(props.slices.length + 1).padStart(3, "0")}`,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    selected: true
  };
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number): SliceRect {
  const image = props.imageState;
  if (image && props.drawOptions.fixedSizeEnabled) {
    const width = Math.max(1, Math.min(Math.round(props.drawOptions.fixedWidth), image.width));
    const height = Math.max(1, Math.min(Math.round(props.drawOptions.fixedHeight), image.height));
    const directionX = endX >= startX ? 1 : -1;
    const directionY = endY >= startY ? 1 : -1;
    const x = directionX > 0 ? startX : startX - width;
    const y = directionY > 0 ? startY : startY - height;

    return makeSlice(
      clamp(x, 0, image.width - width),
      clamp(y, 0, image.height - height),
      width,
      height
    );
  }

  return makeSlice(
    Math.min(startX, endX),
    Math.min(startY, endY),
    Math.abs(endX - startX),
    Math.abs(endY - startY)
  );
}

function onStagePointerDown(event: MouseEvent) {
  closeSliceContextMenu();
  if (!props.imageState) {
    return;
  }

  if (spacePressed.value || event.button === 1) {
    dragState.value = {
      type: "pan",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: props.imageState.offsetX,
      startOffsetY: props.imageState.offsetY
    };
    return;
  }

  const point = clientToImagePoint(event);
  if (!point) {
    return;
  }

  if (props.mode === "draw") {
    const snappedPoint = snapPoint(point);
    emit("clearSelection");
    draftSlice.value = null;
    dragState.value = { type: "draw", startX: snappedPoint.x, startY: snappedPoint.y };
  } else {
    emit("clearSelection");
  }
}

function onSlicePointerDown(event: MouseEvent, slice: SliceRect) {
  event.stopPropagation();
  closeSliceContextMenu();
  if (event.button === 2) {
    return;
  }
  if (spacePressed.value) {
    return;
  }
  const point = clientToImagePoint(event);
  if (!point) {
    return;
  }

  if (props.mode === "draw" && (!slice.selected || slice.locked)) {
    const snappedPoint = snapPoint(point);
    if (!slice.locked) {
      emit("clearSelection");
    }
    draftSlice.value = null;
    dragState.value = {
      type: "draw",
      startX: snappedPoint.x,
      startY: snappedPoint.y,
      selectOnClickId: slice.locked ? undefined : slice.id
    };
    return;
  }

  if (slice.locked) {
    return;
  }

  emit("selectSlice", slice.id, event.ctrlKey || event.metaKey || event.shiftKey);
  emit("updateSlice", slice.id, {}, true);
  dragState.value = { type: "move", id: slice.id, startX: point.x, startY: point.y, original: { ...slice } };
}

function onSliceContextMenu(event: MouseEvent, slice: SliceRect) {
  event.preventDefault();
  event.stopPropagation();
  if (!slice.locked) {
    emit("selectSlice", slice.id, event.ctrlKey || event.metaKey || event.shiftKey);
  }
  sliceContextMenu.value = {
    slice,
    x: Math.min(event.clientX, window.innerWidth - 148),
    y: Math.min(event.clientY, window.innerHeight - 44)
  };
}

function closeSliceContextMenu() {
  sliceContextMenu.value = null;
}

function exportContextSlice() {
  if (!sliceContextMenu.value) {
    return;
  }
  emit("exportSlice", sliceContextMenu.value.slice);
  closeSliceContextMenu();
}

function onResizePointerDown(event: MouseEvent, slice: SliceRect, handle: string) {
  event.stopPropagation();
  if (slice.locked) {
    return;
  }
  const point = clientToImagePoint(event);
  if (!point) {
    return;
  }
  emit("selectSlice", slice.id);
  emit("updateSlice", slice.id, {}, true);
  dragState.value = {
    type: "resize",
    id: slice.id,
    handle,
    startX: point.x,
    startY: point.y,
    original: { ...slice }
  };
}

function onGuidePointerDown(event: MouseEvent, guide: GuideLine) {
  event.stopPropagation();
  dragState.value = { type: "guide", id: guide.id, axis: guide.axis };
}

function onRulerPointerDown(event: MouseEvent, axis: GuideLine["axis"]) {
  event.stopPropagation();
  const point = clientToImagePoint(event);
  const image = props.imageState;
  if (!point || !image) {
    return;
  }
  const guide: GuideLine = {
    id: crypto.randomUUID(),
    axis,
    position: Math.round(axis === "x" ? point.x : point.y)
  };
  emit("addGuide", guide);
  dragState.value = { type: "guide", id: guide.id, axis };
}

function resizeRect(state: Extract<DragState, { type: "resize" }>, point: { x: number; y: number }): Partial<SliceRect> {
  const image = props.imageState;
  const original = state.original;
  if (!image) {
    return {};
  }

  let left = original.x;
  let top = original.y;
  let right = original.x + original.width;
  let bottom = original.y + original.height;
  const minSize = 4;

  const snapped = snapPoint(point, state.id);

  if (state.handle.includes("w")) left = clamp(snapped.x, 0, right - minSize);
  if (state.handle.includes("e")) right = clamp(snapped.x, left + minSize, image.width);
  if (state.handle.includes("n")) top = clamp(snapped.y, 0, bottom - minSize);
  if (state.handle.includes("s")) bottom = clamp(snapped.y, top + minSize, image.height);

  return {
    x: Math.round(left),
    y: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top)
  };
}

function onPointerMove(event: MouseEvent) {
  updateViewportPointer(event);
  if (!props.imageState) {
    return;
  }
  const point = clientToImagePoint(event);
  emit("mousePosition", point ? { x: Math.round(point.x), y: Math.round(point.y) } : null);

  const state = dragState.value;
  if (!state) {
    return;
  }

  if (state.type === "pan") {
    emit("transformChange", {
      offsetX: state.startOffsetX + event.clientX - state.startClientX,
      offsetY: state.startOffsetY + event.clientY - state.startClientY
    });
    return;
  }

  if (!point) {
    return;
  }

  if (state.type === "guide") {
    const rawPoint = clientToRawImagePoint(event);
    if (!rawPoint) {
      return;
    }
    const max = state.axis === "x" ? props.imageState.width : props.imageState.height;
    const position = state.axis === "x" ? rawPoint.x : rawPoint.y;
    const snappedPosition = snapValue(position, state.axis, undefined, state.id);
    emit("updateGuide", state.id, Math.round(clamp(snappedPosition, 0, max)));
    return;
  }

  const snappedPoint = snapPoint(point);

  if (state.type === "draw") {
    const rect = normalizeRect(state.startX, state.startY, snappedPoint.x, snappedPoint.y);
    draftSlice.value = rect;
  }

  if (state.type === "move") {
    const dx = point.x - state.startX;
    const dy = point.y - state.startY;
    emit("updateSlice", state.id, snapMovedRect(state.original, dx, dy), false);
  }

  if (state.type === "resize") {
    emit("updateSlice", state.id, resizeRect(state, point), false);
  }
}

function onPointerUp() {
  if (dragState.value?.type === "draw") {
    if (draftSlice.value) {
      if (draftSlice.value.width >= 4 && draftSlice.value.height >= 4) {
        emit("addSlice", draftSlice.value);
      }
    } else if (dragState.value.selectOnClickId) {
      emit("selectSlice", dragState.value.selectOnClickId);
    }
    draftSlice.value = null;
  }
  dragState.value = null;
}

function updateViewportPointer(event: MouseEvent) {
  const viewport = viewportRef.value;
  if (!viewport) {
    pointerInsideViewport.value = false;
    lastViewportPointer.value = null;
    return;
  }
  const bounds = viewport.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  const inside = x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height;
  pointerInsideViewport.value = inside;
  if (inside) {
    lastViewportPointer.value = { x, y };
  }
}

function onViewportMouseLeave() {
  pointerInsideViewport.value = false;
  lastViewportPointer.value = null;
  emit("mousePosition", null);
}

function zoomAtViewportPointer(factor: number) {
  const image = props.imageState;
  const viewport = viewportRef.value;
  if (!image || !viewport || !pointerInsideViewport.value) {
    return false;
  }
  const pointer = lastViewportPointer.value ?? {
    x: viewport.clientWidth / 2,
    y: viewport.clientHeight / 2
  };
  const beforeX = (pointer.x - image.offsetX) / image.scale;
  const beforeY = (pointer.y - image.offsetY) / image.scale;
  const scale = clamp(Number((image.scale * factor).toFixed(3)), 0.05, 8);
  emit("transformChange", {
    scale,
    offsetX: Math.round(pointer.x - beforeX * scale),
    offsetY: Math.round(pointer.y - beforeY * scale)
  });
  return true;
}

function onWheel(event: WheelEvent) {
  const image = props.imageState;
  const viewport = viewportRef.value;
  if (!image || !viewport) {
    return;
  }
  event.preventDefault();
  const bounds = viewport.getBoundingClientRect();
  const pointerX = event.clientX - bounds.left;
  const pointerY = event.clientY - bounds.top;
  const beforeX = (pointerX - image.offsetX) / image.scale;
  const beforeY = (pointerY - image.offsetY) / image.scale;
  const factor = event.deltaY < 0 ? 1.1 : 0.9;
  const scale = clamp(Number((image.scale * factor).toFixed(3)), 0.05, 8);
  emit("transformChange", {
    scale,
    offsetX: Math.round(pointerX - beforeX * scale),
    offsetY: Math.round(pointerY - beforeY * scale)
  });
}

function nudgeSelected(dx: number, dy: number) {
  const image = props.imageState;
  if (!image) {
    return;
  }
  props.slices
    .filter(slice => slice.selected && !slice.locked)
    .forEach(slice => {
      emit(
        "updateSlice",
        slice.id,
        {
          x: clamp(slice.x + dx, 0, image.width - slice.width),
          y: clamp(slice.y + dy, 0, image.height - slice.height)
        },
        true
      );
    });
}

function onKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  const isEditingText =
    target?.tagName === "INPUT" ||
    target?.tagName === "TEXTAREA" ||
    target?.isContentEditable;

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      emit("redo");
    } else {
      emit("undo");
    }
    return;
  }

  const isZoomInKey = event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
  const isZoomOutKey = event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";
  if ((event.ctrlKey || event.metaKey) && (isZoomInKey || isZoomOutKey)) {
    if (zoomAtViewportPointer(isZoomInKey ? 1.1 : 0.9)) {
      event.preventDefault();
    }
    return;
  }

  if (isEditingText) {
    return;
  }

  if (event.code === "Space") {
    spacePressed.value = true;
  }
  if (event.key === "Delete" || event.key === "Backspace") {
    emit("deleteSelected");
  }
  if (event.key === "Escape") {
    closeSliceContextMenu();
    emit("clearSelection");
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
    event.preventDefault();
    emit("duplicateSelected");
  }
  const amount = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowLeft") nudgeSelected(-amount, 0);
  if (event.key === "ArrowRight") nudgeSelected(amount, 0);
  if (event.key === "ArrowUp") nudgeSelected(0, -amount);
  if (event.key === "ArrowDown") nudgeSelected(0, amount);
}

function onKeyUp(event: KeyboardEvent) {
  if (event.code === "Space") {
    spacePressed.value = false;
  }
}

watch(() => props.imageState?.imageElement, () => nextTick(drawImage));
watch(
  () => (props.imageState ? `${props.imageState.width}x${props.imageState.height}` : ""),
  () => nextTick(fitImage)
);

onMounted(() => {
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousedown", closeSliceContextMenu);
  drawImage();
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", onPointerMove);
  window.removeEventListener("mouseup", onPointerUp);
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("mousedown", closeSliceContextMenu);
});

defineExpose({ fitImage });
</script>

<template>
  <div
    ref="viewportRef"
    class="canvas-viewport"
    :class="{ panning: spacePressed }"
    tabindex="0"
    @mousedown="onStagePointerDown"
    @mouseenter="updateViewportPointer"
    @mousemove="updateViewportPointer"
    @mouseleave="onViewportMouseLeave"
    @wheel="onWheel"
    @dblclick="fitImage"
  >
    <template v-if="imageState">
      <div class="ruler top-ruler" @mousedown="onRulerPointerDown($event, 'y')">
        <span
          v-for="tick in horizontalTicks"
          :key="tick.key"
          class="ruler-tick"
          :class="{ major: tick.major }"
          :style="tick.style"
        >
          <span v-if="tick.label">{{ tick.label }}</span>
        </span>
      </div>
      <div class="ruler left-ruler" @mousedown="onRulerPointerDown($event, 'x')">
        <span
          v-for="tick in verticalTicks"
          :key="tick.key"
          class="ruler-tick"
          :class="{ major: tick.major }"
          :style="tick.style"
        >
          <span v-if="tick.label">{{ tick.label }}</span>
        </span>
      </div>
      <div class="ruler-corner" title="从上方或左侧标尺拖出辅助线" />
      <button
        v-for="guide in guides"
        :key="guide.id"
        type="button"
        class="guide-line"
        :class="guide.axis === 'x' ? 'vertical' : 'horizontal'"
        :style="guideStyle(guide)"
        :title="guide.axis === 'x' ? `竖辅助线 x=${Math.round(guide.position)}` : `横辅助线 y=${Math.round(guide.position)}`"
        @mousedown="onGuidePointerDown($event, guide)"
        @dblclick.stop="emit('deleteGuide', guide.id)"
      />
    </template>
    <div v-if="imageState" class="image-stage" :style="stageStyle">
      <canvas ref="canvasRef" />
      <div class="image-size-badge width-badge">{{ imageState.width }} px</div>
      <div class="image-size-badge height-badge">{{ imageState.height }} px</div>
      <div
        v-for="slice in slices"
        :key="slice.id"
        class="slice-box"
        :class="{ selected: slice.selected, locked: slice.locked }"
        :style="rectStyle(slice)"
        @mousedown="onSlicePointerDown($event, slice)"
        @contextmenu="onSliceContextMenu($event, slice)"
      >
        <span class="slice-label">{{ slice.name }} {{ Math.round(slice.width) }}x{{ Math.round(slice.height) }}</span>
        <template v-if="slice.selected && !slice.locked">
          <button
            v-for="handle in ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']"
            :key="handle"
            type="button"
            class="resize-handle"
            :class="handle"
            @mousedown="onResizePointerDown($event, slice, handle)"
          />
        </template>
      </div>
      <div
        v-if="draftSlice"
        class="slice-box draft"
        :style="rectStyle(draftSlice)"
      >
        <span class="slice-label">{{ Math.round(draftSlice.width) }}x{{ Math.round(draftSlice.height) }}</span>
      </div>
    </div>
    <div
      v-if="sliceContextMenu"
      class="slice-context-menu"
      :style="{ left: `${sliceContextMenu.x}px`, top: `${sliceContextMenu.y}px` }"
      @mousedown.stop
      @contextmenu.prevent.stop
    >
      <button type="button" @click="exportContextSlice">导出该切片</button>
    </div>
    <div v-if="!imageState" class="empty-stage">
      <strong>等待图片</strong>
      <span>上传、拖拽或粘贴图片后即可开始切图</span>
    </div>
  </div>
</template>

<style scoped>
.canvas-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    linear-gradient(45deg, #edf0f5 25%, transparent 25%),
    linear-gradient(-45deg, #edf0f5 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #edf0f5 75%),
    linear-gradient(-45deg, transparent 75%, #edf0f5 75%);
  background-color: #f7f8fa;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
  background-size: 20px 20px;
  outline: none;
  cursor: crosshair;
}

.canvas-viewport.panning {
  cursor: grab;
}

.image-stage {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  border: 1px solid #dcdfe6;
  box-shadow: 0 1px 2px rgb(0 0 0 / 4%);
}

.slice-box {
  position: absolute;
  box-sizing: border-box;
  border: calc(0.75px * var(--inverse-scale, 1)) solid #1677ff;
  background: rgb(22 119 255 / 8%);
  cursor: move;
}

.guide-line {
  position: absolute;
  z-index: 3;
  border: 0;
  padding: 0;
  background: transparent;
}

.ruler {
  position: absolute;
  z-index: 4;
  overflow: hidden;
  border: 0;
  border-color: #e5e7eb;
  background: #ffffff;
  color: #6b7280;
  font-size: 10px;
  user-select: none;
}

.ruler-corner {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 5;
  width: 20px;
  height: 20px;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}

.top-ruler {
  left: 0;
  top: 0;
  width: 100%;
  height: 20px;
  cursor: ns-resize;
}

.left-ruler {
  left: 0;
  top: 0;
  width: 20px;
  height: 100%;
  cursor: ew-resize;
}

.ruler-tick {
  position: absolute;
  display: block;
  color: #f8fafc;
}

.top-ruler .ruler-tick {
  bottom: 0;
  width: 1px;
  height: 7px;
  border-left: 1px solid rgb(248 250 252 / 72%);
  border-left-color: #9ca3af;
}

.top-ruler .ruler-tick.major {
  height: 12px;
}

.top-ruler .ruler-tick span {
  position: absolute;
  left: 3px;
  top: -2px;
}

.left-ruler .ruler-tick {
  right: 0;
  width: 7px;
  height: 1px;
  border-top: 1px solid rgb(248 250 252 / 72%);
  border-top-color: #9ca3af;
}

.left-ruler .ruler-tick.major {
  width: 12px;
}

.left-ruler .ruler-tick span {
  position: absolute;
  left: -1px;
  top: 2px;
  transform: rotate(-90deg);
  transform-origin: left top;
}

.image-size-badge {
  position: absolute;
  z-index: 3;
  border-radius: 4px;
  padding: 2px 6px;
  background: rgb(31 35 41 / 86%);
  color: #fff;
  font-size: 11px;
  line-height: 1.3;
  pointer-events: none;
}

.width-badge {
  left: 50%;
  top: 24px;
  transform: translateX(-50%);
}

.height-badge {
  left: 24px;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
  transform-origin: left center;
}

.guide-line::before {
  content: "";
  position: absolute;
  background: #39ff14;
  box-shadow: none;
}

.guide-line.vertical {
  top: 0;
  width: 12px;
  height: 100%;
  transform: translateX(-6px);
  cursor: ew-resize;
}

.guide-line.vertical::before {
  left: 5.625px;
  top: 0;
  width: 0.75px;
  height: 100%;
}

.guide-line.horizontal {
  left: 0;
  width: 100%;
  height: 12px;
  transform: translateY(-6px);
  cursor: ns-resize;
}

.guide-line.horizontal::before {
  left: 0;
  top: 5.625px;
  width: 100%;
  height: 0.75px;
}

.slice-box.selected {
  border: calc(0.75px * var(--inverse-scale, 1)) solid #1677ff;
  background: rgb(22 119 255 / 10%);
}

.slice-box.locked {
  border-color: #9ca3af;
  background: rgb(156 163 175 / 12%);
  cursor: not-allowed;
}

.slice-box.draft {
  border-color: #1677ff;
  background: rgb(22 119 255 / 8%);
  pointer-events: none;
}

.slice-context-menu {
  position: fixed;
  z-index: 20;
  min-width: 128px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 4px;
  background: #fff;
  box-shadow: 0 8px 20px rgb(31 35 41 / 12%);
}

.slice-context-menu button {
  display: flex;
  align-items: center;
  width: 100%;
  height: 30px;
  border: 0;
  border-radius: 4px;
  padding: 0 10px;
  background: transparent;
  color: var(--app-text-regular);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.slice-context-menu button:hover {
  background: var(--app-primary-bg);
  color: var(--app-primary);
}

.slice-label {
  position: absolute;
  left: calc(5px * var(--inverse-scale, 1));
  top: calc(5px * var(--inverse-scale, 1));
  max-width: calc(100% * var(--stage-scale, 1) - 12px);
  overflow: hidden;
  border-radius: 6px;
  padding: 2px 5px;
  background: rgb(31 35 41 / 88%);
  color: white;
  font-size: 10px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  transform: scale(var(--inverse-scale, 1));
  transform-origin: left top;
}

.resize-handle {
  position: absolute;
  appearance: none;
  box-sizing: border-box;
  width: calc(8px * var(--inverse-scale, 1));
  min-width: 0;
  height: calc(8px * var(--inverse-scale, 1));
  min-height: 0;
  border: calc(1px * var(--inverse-scale, 1)) solid #ffffff;
  border-radius: calc(2px * var(--inverse-scale, 1));
  padding: 0;
  background: #1677ff;
  line-height: 0;
  transform: translate(-50%, -50%);
  transform-origin: center;
}

.resize-handle.nw,
.resize-handle.se {
  cursor: nwse-resize;
}

.resize-handle.ne,
.resize-handle.sw {
  cursor: nesw-resize;
}

.resize-handle.n,
.resize-handle.s {
  cursor: ns-resize;
}

.resize-handle.e,
.resize-handle.w {
  cursor: ew-resize;
}

.resize-handle.nw { left: 0; top: 0; }
.resize-handle.n { left: 50%; top: 0; }
.resize-handle.ne { left: 100%; top: 0; }
.resize-handle.e { left: 100%; top: 50%; }
.resize-handle.se { left: 100%; top: 100%; }
.resize-handle.s { left: 50%; top: 100%; }
.resize-handle.sw { left: 0; top: 100%; }
.resize-handle.w { left: 0; top: 50%; }

.empty-stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  gap: 8px;
  color: #6b7280;
  text-align: center;
}

.empty-stage strong {
  color: #1f2329;
  font-size: 18px;
}
</style>
