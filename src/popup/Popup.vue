<script setup lang="ts">
import { TOOL_PAGE_PATH } from "../shared/constants";

function openImageSlicer() {
  const url = chrome.runtime.getURL(TOOL_PAGE_PATH);
  chrome.tabs.create({ url });
}
</script>

<template>
  <main class="popup">
    <section>
      <p class="eyebrow">Frontend Tools</p>
      <h1>图片切图工具</h1>
      <p>上传截图或素材图，框选切片并导出前端可用资源包。</p>
    </section>
    <button type="button" @click="openImageSlicer">打开切图工具</button>
  </main>
</template>

<style scoped>
.popup {
  display: grid;
  gap: 16px;
  padding: 18px;
  background: #f7f9fc;
}

.eyebrow {
  margin: 0 0 6px;
  color: #536179;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 8px;
  font-size: 20px;
}

p {
  margin: 0;
  color: #4b5870;
  line-height: 1.5;
}

button {
  border: 0;
  border-radius: 8px;
  padding: 11px 14px;
  background: #1463ff;
  color: white;
  font-weight: 700;
  cursor: pointer;
}
</style>
