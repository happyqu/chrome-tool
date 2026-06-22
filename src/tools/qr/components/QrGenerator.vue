<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { CircleClose, Download, Picture, Refresh, Setting } from "@element-plus/icons-vue";
import QRCode from "qrcode";
import { detectQrContentType } from "../core/qrContentDetect";
import { typeLabel } from "../core/format";

type ExportFormat = "png" | "jpeg" | "webp" | "svg";
type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const qrDataUrl = ref("");
const generating = ref(false);
const logoInputRef = ref<HTMLInputElement | null>(null);
const logoDataUrl = ref("");
const logoFileName = ref("");
const exportFormat = ref<ExportFormat>("png");
const qrSize = ref(320);
const qrMargin = ref(2);
const logoSize = ref(22);
const errorCorrectionLevel = ref<ErrorCorrectionLevel>("M");
const contentType = computed(() => typeLabel(detectQrContentType(props.modelValue)));
const formatOptions = [
  { label: "PNG", value: "png" },
  { label: "JPEG", value: "jpeg" },
  { label: "WebP", value: "webp" },
  { label: "SVG", value: "svg" }
];
const sizeOptions = [256, 320, 512, 768, 1024].map(value => ({
  label: `${value}px`,
  value
}));
const levelOptions = [
  { label: "L", value: "L" },
  { label: "M", value: "M" },
  { label: "Q", value: "Q" },
  { label: "H", value: "H" }
];

const renderOptions = computed(() => ({
  errorCorrectionLevel: errorCorrectionLevel.value,
  margin: qrMargin.value,
  width: qrSize.value,
  color: {
    dark: "#111827",
    light: "#ffffff"
  }
}));

watch(
  () => [props.modelValue, qrSize.value, qrMargin.value, errorCorrectionLevel.value, logoDataUrl.value, logoSize.value] as const,
  async ([value]) => {
    if (!value.trim()) {
      qrDataUrl.value = "";
      return;
    }
    generating.value = true;
    try {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, value, renderOptions.value);
      await drawLogo(canvas);
      qrDataUrl.value = canvas.toDataURL("image/png");
    } finally {
      generating.value = false;
    }
  },
  { immediate: true }
);

function canvasToDataUrl(canvas: HTMLCanvasElement, format: ExportFormat) {
  if (format === "jpeg") return canvas.toDataURL("image/jpeg", 0.94);
  if (format === "webp") return canvas.toDataURL("image/webp", 0.94);
  return canvas.toDataURL("image/png");
}

function openLogoPicker() {
  logoInputRef.value?.click();
}

function handleLogoFile(files: FileList | null) {
  const file = files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    ElMessage.warning("请上传图片文件");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    logoDataUrl.value = String(reader.result || "");
    logoFileName.value = file.name;
  };
  reader.readAsDataURL(file);

  if (logoInputRef.value) logoInputRef.value.value = "";
}

function clearLogo() {
  logoDataUrl.value = "";
  logoFileName.value = "";
}

function loadLogoImage() {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Logo 读取失败"));
    image.src = logoDataUrl.value;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function drawLogo(canvas: HTMLCanvasElement) {
  if (!logoDataUrl.value) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const logo = await loadLogoImage();
  const size = Math.round(canvas.width * (logoSize.value / 100));
  const padding = Math.max(8, Math.round(size * 0.16));
  const boxSize = size + padding * 2;
  const x = Math.round((canvas.width - boxSize) / 2);
  const y = Math.round((canvas.height - boxSize) / 2);
  const logoX = x + padding;
  const logoY = y + padding;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, x, y, boxSize, boxSize, Math.round(boxSize * 0.18));
  ctx.fill();
  ctx.drawImage(logo, logoX, logoY, size, size);
  ctx.restore();
}

function addLogoToSvg(svg: string) {
  if (!logoDataUrl.value) return svg;

  const size = Math.round(qrSize.value * (logoSize.value / 100));
  const padding = Math.max(8, Math.round(size * 0.16));
  const boxSize = size + padding * 2;
  const x = Math.round((qrSize.value - boxSize) / 2);
  const y = Math.round((qrSize.value - boxSize) / 2);
  const logoX = x + padding;
  const logoY = y + padding;
  const markup = `<rect x="${x}" y="${y}" width="${boxSize}" height="${boxSize}" rx="${Math.round(boxSize * 0.18)}" fill="#ffffff"/><image href="${logoDataUrl.value}" x="${logoX}" y="${logoY}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;

  return svg.replace("</svg>", `${markup}</svg>`);
}

async function downloadQr() {
  const content = props.modelValue.trim();
  if (!content) return;

  const link = document.createElement("a");

  if (exportFormat.value === "svg") {
    const svg = addLogoToSvg(await QRCode.toString(content, {
      ...renderOptions.value,
      type: "svg"
    }));
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    link.href = URL.createObjectURL(blob);
    link.download = `qrcode-${qrSize.value}.svg`;
    link.click();
    URL.revokeObjectURL(link.href);
    return;
  }

  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, content, renderOptions.value);
  await drawLogo(canvas);

  link.href = canvasToDataUrl(canvas, exportFormat.value);
  link.download = `qrcode-${qrSize.value}.${exportFormat.value === "jpeg" ? "jpg" : exportFormat.value}`;
  link.click();
}
</script>

<template>
  <section class="generator-grid">
    <section class="qr-card generator-editor">
      <input
        ref="logoInputRef"
        class="hidden-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        @change="handleLogoFile(($event.target as HTMLInputElement).files)"
      />
      <div class="card-heading">
        <strong>生成二维码</strong>
        <span>输入文本、链接、Wi-Fi 配置或 JSON 内容</span>
      </div>
      <el-input
        :model-value="modelValue"
        type="textarea"
        :rows="12"
        maxlength="2000"
        show-word-limit
        placeholder="请输入需要生成二维码的内容"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <div class="generator-actions">
        <el-tag effect="light">类型：{{ contentType }}</el-tag>
        <div class="editor-actions">
          <el-button :icon="Refresh" @click="emit('update:modelValue', '')">清空内容</el-button>
        </div>
      </div>
    </section>

    <section class="qr-card generator-preview">
      <div class="card-heading">
        <strong>二维码预览</strong>
      </div>
      <div class="qr-preview-box">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="二维码预览" />
        <el-empty v-else description="输入内容后生成预览" />
      </div>

      <section class="preview-tools">
        <div class="logo-upload-row">
          <button v-if="!logoDataUrl" type="button" class="logo-upload-button" @click="openLogoPicker">
            <el-icon><Picture /></el-icon>
            <span>上传 Logo</span>
          </button>
          <div v-else class="logo-chip">
            <img :src="logoDataUrl" :alt="logoFileName" />
            <span :title="logoFileName">{{ logoFileName }}</span>
            <el-button size="small" :icon="Picture" @click="openLogoPicker">更换</el-button>
            <el-button size="small" :icon="CircleClose" text @click="clearLogo">移除</el-button>
          </div>
        </div>

        <div class="export-toolbar">
          <div class="export-control">
            <el-select v-model="exportFormat" size="small" aria-label="导出格式">
              <el-option v-for="item in formatOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <div class="export-control">
            <el-select v-model="qrSize" size="small" aria-label="导出尺寸">
              <el-option v-for="item in sizeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </div>
          <el-popover placement="bottom-end" trigger="click" :width="320">
            <section class="advanced-settings">
              <div class="setting-control">
                <label>自定义尺寸</label>
                <el-input-number v-model="qrSize" :min="128" :max="1024" :step="16" controls-position="right" />
              </div>
              <div class="setting-control">
                <label>Logo 大小</label>
                <div class="inline-control">
                  <el-slider v-model="logoSize" :min="12" :max="32" :step="1" :disabled="!logoDataUrl" />
                  <el-input-number v-model="logoSize" :min="12" :max="32" :step="1" controls-position="right" :disabled="!logoDataUrl" />
                </div>
              </div>
              <div class="setting-control">
                <label>边距</label>
                <div class="inline-control">
                  <el-slider v-model="qrMargin" :min="0" :max="8" :step="1" />
                  <el-input-number v-model="qrMargin" :min="0" :max="8" :step="1" controls-position="right" />
                </div>
              </div>
              <div class="setting-control">
                <label>纠错级别</label>
                <el-segmented v-model="errorCorrectionLevel" :options="levelOptions" block />
              </div>
            </section>
            <template #reference>
              <el-button :icon="Setting">高级设置</el-button>
            </template>
          </el-popover>
          <el-button type="primary" :icon="Download" :loading="generating" :disabled="!qrDataUrl" @click="downloadQr">
            导出
          </el-button>
        </div>
      </section>
    </section>
  </section>
</template>
