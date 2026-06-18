<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { SliceRect } from "../types";

const props = defineProps<{
  image: HTMLImageElement | null;
  slice: SliceRect;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

function renderPreview() {
  const canvas = canvasRef.value;
  const image = props.image;
  if (!canvas || !image) {
    return;
  }

  const width = Math.max(1, Math.round(props.slice.width));
  const height = Math.max(1, Math.round(props.slice.height));
  const scale = Math.min(96 / width, 64 / height);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    Math.round(props.slice.x),
    Math.round(props.slice.y),
    width,
    height,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

watch(
  () => [props.image, props.slice.x, props.slice.y, props.slice.width, props.slice.height],
  () => nextTick(renderPreview)
);

onMounted(renderPreview);
</script>

<template>
  <div class="preview">
    <canvas v-if="image" ref="canvasRef" />
    <span v-else>无预览</span>
  </div>
</template>

<style scoped>
.preview {
  display: grid;
  place-items: center;
  width: 96px;
  height: 64px;
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  background:
    linear-gradient(45deg, #edf0f5 25%, transparent 25%),
    linear-gradient(-45deg, #edf0f5 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #edf0f5 75%),
    linear-gradient(-45deg, transparent 75%, #edf0f5 75%);
  background-color: #f8fafc;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  background-size: 16px 16px;
}

canvas {
  display: block;
  max-width: 96px;
  max-height: 64px;
}

span {
  color: var(--app-text-secondary);
  font-size: 12px;
}
</style>
