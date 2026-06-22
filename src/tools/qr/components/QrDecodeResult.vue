<script setup lang="ts">
import { computed, ref } from "vue";
import { CopyDocument, Download, Link, Message, Phone, Refresh, View, Warning } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import type { DecodeResult } from "../types";
import { typeLabel } from "../core/format";
import {
  getUrlRiskTips,
  parseEmailContent,
  parsePhoneContent,
  parseSmsContent,
  parseVCardContent,
  parseWifiContent
} from "../core/qrContentParser";

const props = defineProps<{
  result: DecodeResult | null;
  status: string;
}>();

const emit = defineEmits<{
  copy: [content: string];
  regenerate: [content: string];
  retry: [];
}>();

const showWifiPassword = ref(false);

const wifi = computed(() => (props.result?.contentType === "wifi" ? parseWifiContent(props.result.content) : null));
const vcard = computed(() => (props.result?.contentType === "vcard" ? parseVCardContent(props.result.content) : null));
const email = computed(() => (props.result?.contentType === "email" ? parseEmailContent(props.result.content) : null));
const phone = computed(() => (props.result?.contentType === "phone" ? parsePhoneContent(props.result.content) : ""));
const sms = computed(() => (props.result?.contentType === "sms" ? parseSmsContent(props.result.content) : null));
const jsonText = computed(() => {
  if (props.result?.contentType !== "json") return "";
  try {
    return JSON.stringify(JSON.parse(props.result.content), null, 2);
  } catch {
    return props.result.content;
  }
});
const minifiedJson = computed(() => {
  if (props.result?.contentType !== "json") return "";
  try {
    return JSON.stringify(JSON.parse(props.result.content));
  } catch {
    return props.result.content;
  }
});
const riskTips = computed(() => (props.result?.contentType === "url" ? getUrlRiskTips(props.result.content) : []));

function openUrl(url: string) {
  ElMessageBox.confirm("请确认二维码来源可信后再打开链接。", "打开链接", {
    confirmButtonText: "打开链接",
    cancelButtonText: "取消",
    type: "warning"
  }).then(() => window.open(url, "_blank", "noopener,noreferrer"));
}

function navigateTo(url: string) {
  window.location.href = url;
}

function downloadVCard() {
  if (!props.result) return;
  const blob = new Blob([props.result.content], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "contact.vcf";
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="qr-card result-card">
    <div class="card-heading">
      <strong>识别结果</strong>
      <span v-if="result">类型：{{ typeLabel(result.contentType) }}</span>
      <span v-else>等待上传二维码图片</span>
    </div>

    <div v-if="status === 'loading'" class="result-empty">
      <el-icon class="is-loading"><Refresh /></el-icon>
      <p>正在识别二维码...</p>
    </div>

    <div v-else-if="status === 'failed'" class="failed-panel">
      <el-icon><Warning /></el-icon>
      <strong>未识别到二维码，请尝试上传更清晰的图片，或裁剪二维码区域后重新上传。</strong>
      <ol>
        <li>图片过于模糊</li>
        <li>二维码太小或被遮挡</li>
        <li>背景过于复杂或颜色对比度过低</li>
        <li>二维码区域不完整</li>
      </ol>
      <el-button type="primary" plain :icon="Refresh" @click="emit('retry')">增强后重试</el-button>
    </div>

    <div v-else-if="result" class="result-body">
      <template v-if="result.contentType === 'url'">
        <div class="field-row"><span>内容</span><a :href="result.content" target="_blank" rel="noreferrer">{{ result.content }}</a></div>
        <el-alert v-for="tip in riskTips" :key="tip" :title="tip" type="warning" show-icon :closable="false" />
        <div class="action-row">
          <el-button type="primary" :icon="Link" @click="openUrl(result.content)">打开链接</el-button>
          <el-button :icon="CopyDocument" @click="emit('copy', result.content)">复制链接</el-button>
        </div>
      </template>

      <template v-else-if="result.contentType === 'email' && email">
        <div class="field-row"><span>邮箱</span><strong>{{ email.email }}</strong></div>
        <div v-if="email.subject" class="field-row"><span>主题</span><strong>{{ email.subject }}</strong></div>
        <div class="action-row">
          <el-button type="primary" :icon="Message" @click="navigateTo(result.content)">发送邮件</el-button>
          <el-button :icon="CopyDocument" @click="emit('copy', email.email)">复制邮箱</el-button>
          <el-button @click="emit('copy', result.content)">复制完整内容</el-button>
        </div>
      </template>

      <template v-else-if="result.contentType === 'phone'">
        <div class="field-row"><span>号码</span><strong>{{ phone }}</strong></div>
        <div class="action-row">
          <el-button :icon="CopyDocument" @click="emit('copy', phone)">复制号码</el-button>
          <el-button type="primary" :icon="Phone" @click="navigateTo(result.content)">拨打电话</el-button>
        </div>
      </template>

      <template v-else-if="result.contentType === 'sms' && sms">
        <div class="field-row"><span>手机号</span><strong>{{ sms.phone }}</strong></div>
        <div class="field-row"><span>短信内容</span><strong>{{ sms.body || "-" }}</strong></div>
        <div class="action-row">
          <el-button :icon="CopyDocument" @click="emit('copy', sms.phone)">复制手机号</el-button>
          <el-button :disabled="!sms.body" @click="emit('copy', sms.body)">复制短信内容</el-button>
          <el-button @click="emit('copy', result.content)">复制完整内容</el-button>
        </div>
      </template>

      <template v-else-if="result.contentType === 'wifi' && wifi">
        <div class="field-row"><span>Wi-Fi 名称</span><strong>{{ wifi.ssid || "-" }}</strong></div>
        <div class="field-row"><span>加密方式</span><strong>{{ wifi.encryption || "-" }}</strong></div>
        <div class="field-row"><span>密码</span><strong>{{ showWifiPassword ? wifi.password || "-" : "******" }}</strong></div>
        <div class="field-row"><span>隐藏网络</span><strong>{{ wifi.hidden ? "是" : "否" }}</strong></div>
        <div class="action-row">
          <el-button :icon="View" @click="showWifiPassword = !showWifiPassword">
            {{ showWifiPassword ? "隐藏密码" : "显示密码" }}
          </el-button>
          <el-button @click="emit('copy', wifi.ssid || '')">复制 Wi-Fi 名称</el-button>
          <el-button :disabled="!wifi.password" @click="emit('copy', wifi.password || '')">复制密码</el-button>
          <el-button @click="emit('copy', result.content)">复制完整配置</el-button>
        </div>
      </template>

      <template v-else-if="result.contentType === 'vcard' && vcard">
        <div class="field-row"><span>姓名</span><strong>{{ vcard.name || "-" }}</strong></div>
        <div class="field-row"><span>电话</span><strong>{{ vcard.phone || "-" }}</strong></div>
        <div class="field-row"><span>邮箱</span><strong>{{ vcard.email || "-" }}</strong></div>
        <div class="field-row"><span>公司</span><strong>{{ vcard.company || "-" }}</strong></div>
        <div class="field-row"><span>职位</span><strong>{{ vcard.title || "-" }}</strong></div>
        <div class="action-row">
          <el-button :icon="CopyDocument" @click="emit('copy', result.content)">复制联系人信息</el-button>
          <el-button :icon="Download" @click="downloadVCard">下载 vCard</el-button>
        </div>
      </template>

      <template v-else-if="result.contentType === 'json'">
        <pre class="content-box">{{ jsonText }}</pre>
        <div class="action-row">
          <el-button @click="emit('copy', jsonText)">复制 JSON</el-button>
          <el-button @click="emit('copy', minifiedJson)">压缩 JSON</el-button>
        </div>
      </template>

      <template v-else>
        <pre class="content-box">{{ result.content }}</pre>
        <div class="action-row">
          <el-button :icon="CopyDocument" @click="emit('copy', result.content)">复制文本</el-button>
        </div>
      </template>

      <div class="footer-actions">
        <el-button type="primary" plain :icon="Refresh" @click="emit('regenerate', result.content)">重新生成二维码</el-button>
        <el-button :icon="CopyDocument" @click="emit('copy', result.content)">复制完整内容</el-button>
      </div>
    </div>

    <div v-else class="result-empty">
      <p>上传、拖拽或粘贴二维码图片后，识别内容会显示在这里。</p>
    </div>
  </section>
</template>
