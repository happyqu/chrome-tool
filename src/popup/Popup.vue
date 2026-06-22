<script setup lang="ts">
import { IMAGE_COMPRESSOR_PAGE_PATH, IMAGE_SLICER_PAGE_PATH, IP_LOOKUP_PAGE_PATH, QR_TOOL_PAGE_PATH } from "../shared/constants";

function openTool(path: string) {
  const url = chrome.runtime.getURL(path);
  chrome.tabs.create({ url });
}
</script>

<template>
  <main class="popup">
    <section class="intro">
      <p class="eyebrow">Frontend Tools</p>
      <h1>图片工具台</h1>
      <p>本地处理前端图片素材，支持切图、压缩、二维码生成和识别。</p>
    </section>
    <section class="tool-list">
      <button type="button" class="tool-card" @click="openTool(IMAGE_SLICER_PAGE_PATH)">
        <span>图片切图</span>
        <small>框选切片并导出前端资源包</small>
      </button>
      <button type="button" class="tool-card primary" @click="openTool(IMAGE_COMPRESSOR_PAGE_PATH)">
        <span>图片压缩</span>
        <small>本地压缩 PNG / JPEG / WebP，支持批量压缩和 ZIP 下载</small>
      </button>
      <button type="button" class="tool-card" @click="openTool(QR_TOOL_PAGE_PATH)">
        <span>二维码工具</span>
        <small>本地生成二维码，上传、拖拽或粘贴图片识别二维码内容</small>
      </button>
      <button type="button" class="tool-card" @click="openTool(IP_LOOKUP_PAGE_PATH)">
        <span>IP 查询</span>
        <small>查询本机公网 IP 和指定 IP 所在地，支持无 Token 模式</small>
      </button>
    </section>
  </main>
</template>

<style scoped>
.popup {
  display: grid;
  gap: 16px;
  width: 320px;
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

.tool-list {
  display: grid;
  gap: 10px;
}

.tool-card {
  display: grid;
  gap: 5px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
  color: #1f2329;
  text-align: left;
  cursor: pointer;
}

.tool-card:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.tool-card.primary {
  border-color: #b7d9ff;
}

.tool-card span {
  font-weight: 700;
}

.tool-card small {
  color: #6b7280;
  line-height: 1.4;
}
</style>
