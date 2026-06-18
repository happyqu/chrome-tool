<script setup lang="ts">
const emit = defineEmits<{
  upload: [file: File];
  paste: [];
}>();

function handleFiles(files: FileList | null) {
  const file = files?.[0];
  if (file) {
    emit("upload", file);
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  handleFiles(event.dataTransfer?.files ?? null);
}
</script>

<template>
  <section class="upload-panel" @dragover.prevent @drop="onDrop">
    <label class="upload-target">
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="handleFiles(($event.target as HTMLInputElement).files)" />
      <strong>上传图片</strong>
      <span>支持 png、jpg、jpeg、webp，拖拽到这里也可以</span>
    </label>
    <button type="button" @click="emit('paste')">粘贴剪贴板图片</button>
  </section>
</template>

<style scoped>
.upload-panel {
  display: grid;
  gap: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
  padding: 20px;
  background: #fff;
  box-shadow: var(--app-shadow-sm);
}

.upload-target {
  display: grid;
  gap: 6px;
  place-items: center;
  border: 1px dashed #c9d6e8;
  border-radius: 10px;
  padding: 28px 18px;
  background: #f7f8fa;
  color: var(--app-text);
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}

.upload-target:hover {
  border-color: var(--app-primary);
  background: #f0f7ff;
}

.upload-target input {
  display: none;
}

.upload-target span {
  color: var(--app-text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

button {
  height: 32px;
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 0 12px;
  background: white;
  color: var(--app-text-regular);
  font-weight: 500;
  cursor: pointer;
}
</style>
