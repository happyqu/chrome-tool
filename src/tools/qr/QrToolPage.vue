<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import QrDecoder from "./components/QrDecoder.vue";
import QrGenerator from "./components/QrGenerator.vue";

const activeTab = ref<"generate" | "decode">("generate");
const generatorContent = ref("https://example.com");

function regenerateQrCode(content: string) {
  generatorContent.value = content;
  activeTab.value = "generate";
  ElMessage.success("已带入生成二维码");
}
</script>

<template>
  <main class="qr-tool-page">
    <header class="qr-page-header">
      <section class="qr-page-title">
        <h1>二维码工具</h1>
        <p>本地生成与识别二维码，支持链接、Wi-Fi、名片、JSON 和文本内容。</p>
      </section>
    </header>

    <section class="qr-page-body">
      <el-segmented
        v-model="activeTab"
        class="tool-switch"
        :options="[
          { label: '生成二维码', value: 'generate' },
          { label: '识别二维码', value: 'decode' }
        ]"
      />
      <QrGenerator v-if="activeTab === 'generate'" v-model="generatorContent" />
      <QrDecoder v-else :active="activeTab === 'decode'" @regenerate="regenerateQrCode" />
    </section>

    <footer class="qr-statusbar">
      <span>本地处理</span>
      <span>不保存上传图片</span>
      <span>支持 Ctrl + V 粘贴识别</span>
    </footer>
  </main>
</template>
