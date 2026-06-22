<script setup lang="ts">
import { CopyDocument, Delete, Refresh } from "@element-plus/icons-vue";
import type { QrDecodeHistoryItem } from "../types";
import { typeLabel } from "../core/format";

defineProps<{
  items: QrDecodeHistoryItem[];
}>();

const emit = defineEmits<{
  copy: [content: string];
  regenerate: [content: string];
  remove: [id: string];
  clear: [];
}>();
</script>

<template>
  <section class="qr-card history-card">
    <div class="card-heading history-heading">
      <div>
        <strong>最近识别记录</strong>
        <span>最多保存 30 条，不保存原始图片</span>
      </div>
      <el-button size="small" :icon="Delete" :disabled="!items.length" @click="emit('clear')">清空历史</el-button>
    </div>

    <el-empty v-if="!items.length" description="暂无识别记录" />
    <div v-else class="history-list">
      <article v-for="item in items" :key="item.id" class="history-item">
        <div class="history-main" @click="emit('copy', item.content)">
          <el-tag size="small" effect="light">{{ typeLabel(item.contentType) }}</el-tag>
          <strong :title="item.content">{{ item.content }}</strong>
          <span>{{ item.fileName || "粘贴图片" }} · {{ new Date(item.createdAt).toLocaleString() }}</span>
        </div>
        <div class="history-actions">
          <el-button size="small" :icon="CopyDocument" @click="emit('copy', item.content)" />
          <el-button size="small" :icon="Refresh" @click="emit('regenerate', item.content)" />
          <el-button size="small" :icon="Delete" @click="emit('remove', item.id)" />
        </div>
      </article>
    </div>
  </section>
</template>

