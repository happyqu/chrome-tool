<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { CopyDocument, Delete, Download, Refresh, Search, View } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import JSZip from "jszip";
import { addHistoryItem, loadStoredState, lookupIp, saveStoredState } from "./core/ipinfo";
import { isValidIp } from "./core/validate";
import type { IpLookupHistoryItem, IpLookupResult } from "./types";

interface BatchLookupItem {
  ip: string;
  status: "pending" | "success" | "failed";
  result?: IpLookupResult;
  error?: string;
}

const token = ref("");
const manualIp = ref("");
const activeWorkTab = ref<"single" | "batch">("single");
const batchInput = ref("");
const batchDelay = ref(1200);
const batchResults = ref<BatchLookupItem[]>([]);
const result = ref<IpLookupResult | null>(null);
const selfResult = ref<IpLookupResult | null>(null);
const history = ref<IpLookupHistoryItem[]>([]);
const isLoadingSelf = ref(false);
const isLoadingManual = ref(false);
const isBatchRunning = ref(false);
const isSavingToken = ref(false);
const errorMessage = ref("");
const stopBatchRequested = ref(false);

const apiMode = computed(() => (token.value.trim() ? "Token 模式" : "无 Token 模式"));
const apiModeDescription = computed(() =>
  token.value.trim() ? "使用 IPinfo Lite API，返回国家和 ASN 信息" : "使用 ipinfo.io 公共 JSON 接口，字段和限制以服务端为准"
);
const minBatchDelay = computed(() => (token.value.trim() ? 300 : 1000));
const batchProgress = computed(() => {
  const total = batchResults.value.length;
  const done = batchResults.value.filter(item => item.status !== "pending").length;
  return {
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0
  };
});
const locationText = computed(() => {
  if (!selfResult.value) return "-";
  return [selfResult.value.country || selfResult.value.countryCode, selfResult.value.region, selfResult.value.city].filter(Boolean).join(" / ") || "-";
});

function resultRows(item: IpLookupResult | null) {
  if (!item) return [];

  return [
    ["IP 地址", item.ip],
    ["国家/地区", [item.country, item.countryCode].filter(Boolean).join(" ")],
    ["洲", [item.continent, item.continentCode].filter(Boolean).join(" ")],
    ["省市", [item.region, item.city].filter(Boolean).join(" / ")],
    ["经纬度", item.location],
    ["时区", item.timezone],
    ["ASN", item.asn],
    ["运营商/组织", item.organization],
    ["域名", item.domain],
    ["主机名", item.hostname],
    ["邮编", item.postal],
    ["接口模式", item.source === "token" ? "IPinfo Lite" : "公共 JSON"]
  ].filter(([, value]) => Boolean(value));
}

async function persistState() {
  await saveStoredState({
    token: token.value.trim(),
    history: history.value
  });
}

async function applyResult(nextResult: IpLookupResult, queryType: "self" | "manual") {
  result.value = nextResult;
  history.value = addHistoryItem(history.value, nextResult, queryType);
  await persistState();
}

async function querySelf() {
  errorMessage.value = "";
  isLoadingSelf.value = true;
  try {
    const nextResult = await lookupIp(null, token.value);
    selfResult.value = nextResult;
    await applyResult(nextResult, "self");
    ElMessage.success("已查询本机公网 IP");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "查询本机 IP 失败";
    ElMessage.error(errorMessage.value);
  } finally {
    isLoadingSelf.value = false;
  }
}

async function queryManual() {
  const ip = manualIp.value.trim();
  if (!isValidIp(ip)) {
    ElMessage.warning("请输入有效的 IPv4 或 IPv6 地址");
    return;
  }

  errorMessage.value = "";
  isLoadingManual.value = true;
  try {
    await applyResult(await lookupIp(ip, token.value), "manual");
    ElMessage.success("查询完成");
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "查询 IP 失败";
    ElMessage.error(errorMessage.value);
  } finally {
    isLoadingManual.value = false;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function parseBatchIps() {
  const seen = new Set<string>();
  const ips = batchInput.value
    .split(/[\s,;，；]+/)
    .map(ip => ip.trim())
    .filter(Boolean)
    .filter(ip => {
      if (seen.has(ip)) return false;
      seen.add(ip);
      return true;
    });

  const invalidIps = ips.filter(ip => !isValidIp(ip));
  const validIps = ips.filter(ip => isValidIp(ip)).slice(0, 50);
  return { validIps, invalidIps, skippedCount: Math.max(0, ips.length - 50) };
}

async function queryBatch() {
  const { validIps, invalidIps, skippedCount } = parseBatchIps();
  if (!validIps.length) {
    ElMessage.warning("请输入有效的 IPv4 或 IPv6 地址");
    return;
  }

  const delay = Math.max(batchDelay.value || 0, minBatchDelay.value);
  batchDelay.value = delay;
  batchResults.value = validIps.map(ip => ({ ip, status: "pending" }));
  stopBatchRequested.value = false;
  isBatchRunning.value = true;
  errorMessage.value = "";

  if (invalidIps.length || skippedCount) {
    ElMessage.warning(`已忽略 ${invalidIps.length + skippedCount} 个无效或超出上限的条目`);
  }

  try {
    for (let index = 0; index < batchResults.value.length; index += 1) {
      if (stopBatchRequested.value) break;

      const item = batchResults.value[index];
      try {
        const nextResult = await lookupIp(item.ip, token.value);
        item.status = "success";
        item.result = nextResult;
        result.value = nextResult;
        history.value = addHistoryItem(history.value, nextResult, "manual");
        await persistState();
      } catch (error) {
        item.status = "failed";
        item.error = error instanceof Error ? error.message : "查询失败";
      }

      if (index < batchResults.value.length - 1 && !stopBatchRequested.value) {
        await sleep(delay);
      }
    }

    ElMessage.success(stopBatchRequested.value ? "批量查询已停止" : "批量查询完成");
  } finally {
    isBatchRunning.value = false;
    stopBatchRequested.value = false;
  }
}

function stopBatch() {
  stopBatchRequested.value = true;
}

function downloadText(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  return value == null ? "" : String(value);
}

function exportBatchJson() {
  const rows = batchResults.value.map(item => ({
    ip: item.ip,
    status: item.status,
    error: item.error,
    result: item.result?.raw ?? null
  }));
  downloadText(JSON.stringify(rows, null, 2), `ip-lookup-batch-${Date.now()}.json`, "application/json;charset=utf-8");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function escapeXml(value: unknown) {
  return csvCell(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function exportBatchExcel() {
  const headers = ["ip", "status", "country", "country_code", "region", "city", "location", "timezone", "asn", "organization", "domain", "source", "error"];
  const rows = batchResults.value.map(item => {
    const data = item.result;
    return [
      item.ip,
      item.status,
      data?.country,
      data?.countryCode,
      data?.region,
      data?.city,
      data?.location,
      data?.timezone,
      data?.asn,
      data?.organization,
      data?.domain,
      data?.source,
      item.error
    ];
  });

  const allRows = [headers, ...rows];
  const sheetData = allRows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const ref = `${columnName(cellIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );
  zip.folder("xl")?.file(
    "workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="IP Lookup" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`
  );
  zip.folder("xl")?.folder("_rels")?.file(
    "workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
  );
  zip.folder("xl")?.folder("worksheets")?.file(
    "sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetData}</sheetData>
</worksheet>`
  );

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ip-lookup-batch-${Date.now()}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

async function saveToken() {
  isSavingToken.value = true;
  try {
    await persistState();
    ElMessage.success(token.value.trim() ? "Token 已保存" : "已切换到无 Token 模式");
  } finally {
    isSavingToken.value = false;
  }
}

async function copyResult() {
  if (!result.value) return;
  await navigator.clipboard.writeText(JSON.stringify(result.value.raw, null, 2));
  ElMessage.success("已复制原始 JSON");
}

async function copyIp(ip: string) {
  await navigator.clipboard.writeText(ip);
  ElMessage.success("已复制 IP");
}

async function selectHistory(item: IpLookupHistoryItem) {
  result.value = item;
}

async function requeryHistory(item: IpLookupHistoryItem) {
  manualIp.value = item.ip;
  await queryManual();
}

async function removeHistory(id: string) {
  history.value = history.value.filter(item => item.id !== id);
  await persistState();
}

async function clearHistory() {
  history.value = [];
  await persistState();
  ElMessage.success("历史记录已清空");
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

onMounted(async () => {
  const state = await loadStoredState();
  token.value = state.token || "";
  history.value = state.history || [];
  await querySelf();
});
</script>

<template>
  <main class="ip-lookup-page">
    <header class="ip-header">
      <section class="ip-title">
        <h1>IP 查询</h1>
        <p>查询本机公网 IP 或指定 IP 所在地，支持无 Token 公共接口和 IPinfo Lite Token 模式</p>
      </section>
      <section class="ip-header-actions">
        <el-button type="primary" :icon="Refresh" :loading="isLoadingSelf" @click="querySelf">刷新本机 IP</el-button>
        <el-button :icon="CopyDocument" :disabled="!result" @click="copyResult">复制 JSON</el-button>
      </section>
    </header>

    <section class="ip-layout">
      <aside class="ip-sidebar">
        <section class="tool-panel self-panel">
          <div class="panel-title">本机公网 IP</div>
          <div class="self-ip">
            <strong>{{ selfResult?.ip || "查询中" }}</strong>
            <el-button size="small" :icon="CopyDocument" :disabled="!selfResult?.ip" @click="copyIp(selfResult!.ip)" />
          </div>
          <dl class="compact-list">
            <div>
              <dt>位置</dt>
              <dd>{{ locationText }}</dd>
            </div>
            <div>
              <dt>组织</dt>
              <dd>{{ selfResult?.organization || "-" }}</dd>
            </div>
            <div>
              <dt>接口</dt>
              <dd>{{ selfResult?.source === "token" ? "IPinfo Lite" : "公共 JSON" }}</dd>
            </div>
          </dl>
        </section>

        <section class="tool-panel token-panel">
          <div class="panel-title">IPinfo Token</div>
          <el-input v-model="token" type="password" show-password placeholder="可选，不填写也能查询" />
          <p>{{ apiMode }}：{{ apiModeDescription }}</p>
          <el-button type="primary" plain :loading="isSavingToken" @click="saveToken">保存设置</el-button>
        </section>
      </aside>

      <section class="ip-main">
        <section class="work-tabs">
          <el-segmented
            v-model="activeWorkTab"
            :options="[
              { label: '单个查询', value: 'single' },
              { label: '批量查询', value: 'batch' }
            ]"
          />
        </section>

        <el-alert v-if="errorMessage" class="error-alert" :title="errorMessage" type="error" show-icon :closable="false" />

        <template v-if="activeWorkTab === 'single'">
          <section class="query-bar">
            <el-input
              v-model="manualIp"
              clearable
              size="large"
              placeholder="输入 IPv4 或 IPv6，例如 8.8.8.8"
              @keydown.enter.prevent="queryManual"
            />
            <el-button type="primary" size="large" :icon="Search" :loading="isLoadingManual" @click="queryManual">查询</el-button>
          </section>

          <section class="result-panel">
            <div class="result-heading">
              <div>
                <span>查询结果</span>
                <strong>{{ result?.ip || "暂无结果" }}</strong>
              </div>
              <el-tag :type="token.trim() ? 'success' : 'info'" effect="light">{{ apiMode }}</el-tag>
            </div>

            <el-empty v-if="!result" description="暂无查询结果" />
            <dl v-else class="result-grid">
              <div v-for="[label, value] in resultRows(result)" :key="label">
                <dt>{{ label }}</dt>
                <dd>{{ value }}</dd>
              </div>
            </dl>
          </section>
        </template>

        <section v-else class="batch-panel">
          <div class="batch-heading">
            <div>
              <span>批量查询</span>
              <strong>{{ batchProgress.done }} / {{ batchProgress.total || 0 }}</strong>
            </div>
            <el-progress v-if="batchProgress.total" :percentage="batchProgress.percent" :stroke-width="6" />
          </div>
          <el-input
            v-model="batchInput"
            type="textarea"
            :rows="5"
            resize="none"
            placeholder="每行一个 IP，或用空格、逗号分隔；单次最多 50 个"
            :disabled="isBatchRunning"
          />
          <div class="batch-controls">
            <label>
              查询间隔
              <el-input-number
                v-model="batchDelay"
                :min="minBatchDelay"
                :max="10000"
                :step="100"
                :disabled="isBatchRunning"
                controls-position="right"
              />
              <small>毫秒</small>
            </label>
            <div>
              <el-button v-if="isBatchRunning" type="warning" @click="stopBatch">停止</el-button>
              <el-button v-else type="primary" :icon="Search" @click="queryBatch">开始批量查询</el-button>
              <el-button :icon="Download" :disabled="!batchResults.length || isBatchRunning" @click="exportBatchExcel">导出 Excel</el-button>
              <el-button :icon="Download" :disabled="!batchResults.length || isBatchRunning" @click="exportBatchJson">导出 JSON</el-button>
            </div>
          </div>
          <section class="batch-results" :class="{ 'is-empty': !batchResults.length }">
            <el-empty v-if="!batchResults.length" description="暂无批量查询结果" />
            <article v-for="item in batchResults" v-else :key="item.ip" class="batch-result-item" :class="`is-${item.status}`">
              <strong>{{ item.ip }}</strong>
              <span v-if="item.result">{{ item.result.country || item.result.countryCode || "未知位置" }} · {{ item.result.organization || item.result.asn || "未知组织" }}</span>
              <span v-else-if="item.error">{{ item.error }}</span>
              <span v-else>等待查询</span>
            </article>
          </section>
        </section>
      </section>

      <aside class="ip-history">
        <section class="tool-panel history-panel">
          <div class="history-heading">
            <div class="panel-title">查询历史</div>
            <el-button size="small" :icon="Delete" :disabled="!history.length" @click="clearHistory">清空</el-button>
          </div>
          <el-empty v-if="!history.length" description="暂无历史记录" />
          <section v-else class="history-list">
            <article v-for="item in history" :key="item.id" class="history-item">
              <button type="button" class="history-content" @click="selectHistory(item)">
                <strong>{{ item.ip }}</strong>
                <span>{{ item.country || item.countryCode || "未知位置" }} · {{ item.organization || item.asn || "未知组织" }}</span>
                <small>{{ item.queryType === "self" ? "本机 IP" : "手动查询" }} · {{ formatTime(item.queriedAt) }}</small>
              </button>
              <div class="history-actions">
                <el-button size="small" :icon="View" @click="requeryHistory(item)" />
                <el-button size="small" :icon="CopyDocument" @click="copyIp(item.ip)" />
                <el-button size="small" :icon="Delete" @click="removeHistory(item.id)" />
              </div>
            </article>
          </section>
        </section>
      </aside>
    </section>

    <footer class="ip-statusbar">
      <span>{{ apiMode }}</span>
      <span>无 Token 可查询</span>
      <span>Token 模式使用 IPinfo Lite</span>
    </footer>
  </main>
</template>
