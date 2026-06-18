# Codex 任务：为 Chrome 前端工具插件新增图片压缩功能

## 1. 背景

当前项目是一个 **Chrome 插件工具集合**，技术栈为：

```txt
Vue 3
TypeScript
Vite
Element Plus
Chrome Extension Manifest V3
```

现有插件中已经规划 / 实现了图片切图工具，包括：

```txt
图片上传
手动裁剪
自动分割
批量导出 ZIP
manifest.json
前端资源导出
```

现在需要新增一个独立的 **图片压缩工具**，作为插件中的新工具模块。

目标是做出尽量接近 **TinyPNG / Squoosh** 的本地图片压缩体验：

```txt
本地完成压缩
不上传服务器
压缩效果尽量优秀
UI 简洁专业
支持批量图片
支持 PNG / JPEG / WebP
尽量使用 WASM 专业编码器
大图处理放入 Web Worker
```

请在现有项目基础上新增功能，不要重写成无关的新项目。

---

## 2. 功能定位

新增工具名称建议：

```txt
图片压缩
Image Compressor
Tiny Compressor
前端图片压缩助手
```

一句话定位：

> 一个面向前端开发者的本地图片压缩工具，支持 PNG、JPEG、WebP 批量压缩，尽量接近 TinyPNG 的压缩体验，所有图片仅在浏览器本地处理。

---

## 3. 核心目标

必须实现：

```txt
上传一张或多张图片
显示图片列表
显示原图大小
本地压缩图片
显示压缩后大小
显示节省百分比
显示输出格式
显示压缩策略
支持单图下载
支持批量 ZIP 下载
支持压缩模式选择
支持是否允许转 WebP
压缩任务放入 Web Worker
不上传任何图片到服务器
```

---

## 4. 体验目标

视觉和交互效果尽量接近 TinyPNG：

```txt
上传区域醒目
拖拽上传体验顺滑
上传后显示队列
每张图片都有压缩状态
压缩完成后显示节省比例
如果压缩效果很好，突出显示 saved percent
如果图片已接近最优，友好提示
可以一键下载全部压缩结果
```

但整体 UI 仍应和现有插件保持一致：

```txt
简约
扁平
工具感强
接近 Ant Design Pro 风格
继续使用 Element Plus
不要引入 Ant Design Vue
```

---

## 5. 技术要求

### 5.1 Chrome Extension 要求

必须兼容 Manifest V3。

不要从 CDN 加载脚本。

所有代码必须打包进插件本地：

```txt
JS
CSS
Worker
WASM
图片资源
```

不要请求不必要权限。

图片压缩不需要访问网页内容，因此默认不需要：

```txt
tabs
activeTab
scripting
```

如果当前插件已有其他工具需要这些权限，可以保留；否则图片压缩工具不要额外增加权限。

Manifest 需要支持 WASM：

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';"
  }
}
```

注意：

```txt
如果项目当前 manifest 已经配置 CSP，请在不破坏现有配置的前提下合并。
不要覆盖已有工具所需配置。
```

---

## 6. 推荐依赖

优先使用 WASM 图像编码器。

建议依赖：

```bash
npm install @jsquash/png @jsquash/oxipng @jsquash/jpeg @jsquash/webp
```

可选依赖：

```bash
npm install libimagequant-wasm
```

说明：

```txt
PNG 压缩效果是重点。
如果 libimagequant-wasm 能稳定接入，请优先使用。
如果当前构建环境难以稳定接入，请保留清晰适配层接口，并用 @jsquash/oxipng 或其他可运行方案兜底。
不要只使用 canvas.toBlob() 作为主压缩方案。
Canvas 只允许作为最后兜底方案。
```

---

## 7. 推荐目录结构

请在现有项目结构中新增图片压缩模块。

如果当前项目已有统一 tools 目录，建议：

```txt
src/
  tools/
    image-compressor/
      ImageCompressorPage.vue
      components/
        CompressorUpload.vue
        CompressorToolbar.vue
        CompressorList.vue
        CompressorResultCard.vue
        CompressorSettings.vue
      core/
        compress.ts
        presets.ts
        candidates.ts
        naming.ts
        zip.ts
      codecs/
        png.ts
        jpeg.ts
        webp.ts
        fallback.ts
      worker/
        compress.worker.ts
        worker-pool.ts
      quality/
        ssim.ts
        compare.ts
      utils/
        format.ts
        image-data.ts
        size.ts
      types.ts
```

如果当前项目是扁平结构，也可以按现有结构调整，但请保持职责清晰。

---

## 8. 路由 / 入口要求

需要在插件工具入口中新增：

```txt
图片压缩
```

用户点击后进入 `ImageCompressorPage.vue`。

入口卡片建议文案：

```txt
图片压缩
本地压缩 PNG / JPEG / WebP，支持批量压缩和 ZIP 下载
```

---

## 9. 核心类型定义

请新增 `types.ts`。

```ts
export type CompressionMode = "high" | "balanced" | "small" | "extreme";

export type CompressStatus =
  | "pending"
  | "compressing"
  | "success"
  | "failed"
  | "skipped";

export type SupportedImageMimeType =
  | "image/png"
  | "image/jpeg"
  | "image/webp";

export interface CompressFileItem {
  id: string;
  file: File;
  fileName: string;
  mimeType: SupportedImageMimeType;
  originalSize: number;
  status: CompressStatus;
  progress?: number;
  error?: string;
  result?: CompressResult;
  previewUrl?: string;
  outputUrl?: string;
}

export interface CompressOptions {
  mode: CompressionMode;
  allowConvertToWebp: boolean;
  allowKeepOriginal: boolean;
  preserveOriginalFormat: boolean;
}

export interface CompressResult {
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
  strategy: string;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  qualityScore?: number;
}

export interface CompressCandidate {
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
  strategy: string;
  qualityScore?: number;
}
```

---

## 10. 压缩模式

请实现 4 个压缩模式。

默认使用 `balanced`。

```ts
import type { CompressionMode } from "./types";

export const compressionPresets = {
  high: {
    label: "高清",
    description: "优先保留画质，适合重要素材",
    pngColors: 256,
    pngQualityMin: 82,
    pngQualityMax: 96,
    jpegQuality: 86,
    webpQuality: 88,
    oxipngLevel: 3
  },
  balanced: {
    label: "均衡",
    description: "推荐，兼顾体积和画质",
    pngColors: 256,
    pngQualityMin: 65,
    pngQualityMax: 90,
    jpegQuality: 80,
    webpQuality: 80,
    oxipngLevel: 4
  },
  small: {
    label: "小体积",
    description: "更小文件，轻微画质损失",
    pngColors: 128,
    pngQualityMin: 50,
    pngQualityMax: 82,
    jpegQuality: 72,
    webpQuality: 72,
    oxipngLevel: 4
  },
  extreme: {
    label: "极限",
    description: "最大压缩，画质损失更明显",
    pngColors: 64,
    pngQualityMin: 35,
    pngQualityMax: 75,
    jpegQuality: 64,
    webpQuality: 64,
    oxipngLevel: 6
  }
} as const satisfies Record<CompressionMode, {
  label: string;
  description: string;
  pngColors: number;
  pngQualityMin: number;
  pngQualityMax: number;
  jpegQuality: number;
  webpQuality: number;
  oxipngLevel: number;
}>;
```

---

## 11. PNG 压缩要求

PNG 是重点。

目标 pipeline：

```txt
PNG
 ↓
decode to ImageData
 ↓
pngquant-like perceptual quantization
 ↓
palette PNG
 ↓
oxipng optimize
 ↓
output PNG
```

### 11.1 必须实现函数

```ts
export async function compressPngBest(
  input: Uint8Array,
  options: {
    mode: CompressionMode;
    allowConvertToWebp: boolean;
    allowKeepOriginal: boolean;
  }
): Promise<CompressResult>;
```

### 11.2 PNG 候选策略

请至少生成这些候选：

```txt
1. 原 PNG 使用 oxipng 做无损优化
2. 如果可用，使用 libimagequant / pngquant-like 量化后再 oxipng
3. 如果允许转 WebP，生成 WebP 候选
4. 对照片型 PNG，WebP 候选通常更小，应参与最终比较
5. 如果所有压缩结果都比原图更大，保留原图
```

### 11.3 PNG 策略名称建议

```txt
png-oxipng-lossless
png-quantized-oxipng
png-to-webp
original-kept
canvas-fallback
```

---

## 12. JPEG 压缩要求

JPEG 不要用 Canvas 默认编码作为主路径。

### 12.1 必须实现函数

```ts
export async function compressJpegBest(
  input: Uint8Array,
  options: {
    mode: CompressionMode;
    allowConvertToWebp: boolean;
    allowKeepOriginal: boolean;
  }
): Promise<CompressResult>;
```

### 12.2 JPEG 候选策略

请至少生成：

```txt
1. 使用 MozJPEG / @jsquash/jpeg 重新编码
2. 优先 progressive JPEG
3. 根据压缩模式使用不同 quality
4. 如果允许转 WebP，生成 WebP 候选
5. 如果所有结果比原图更大，保留原图
```

策略名称建议：

```txt
jpeg-mozjpeg
jpeg-progressive
jpeg-to-webp
original-kept
canvas-fallback
```

---

## 13. WebP 压缩要求

### 13.1 必须实现函数

```ts
export async function compressWebpBest(
  input: Uint8Array,
  options: {
    mode: CompressionMode;
    allowKeepOriginal: boolean;
  }
): Promise<CompressResult>;
```

### 13.2 WebP 候选策略

请至少生成：

```txt
1. 解码为 ImageData
2. 使用 WebP WASM 重新编码
3. 根据压缩模式调整 quality
4. 如果结果更大，保留原图
```

策略名称建议：

```txt
webp-reencode
webp-lossy
original-kept
canvas-fallback
```

---

## 14. 自动候选比较

请实现候选选择逻辑。

```ts
export function pickBestCandidate(
  original: Uint8Array,
  candidates: CompressCandidate[],
  options: {
    mode: CompressionMode;
    allowKeepOriginal: boolean;
  }
): CompressResult;
```

选择规则：

```txt
1. 过滤掉体积大于等于原图的候选，除非没有任何候选变小
2. 如果存在 qualityScore，优先保留质量达到阈值的候选
3. 在质量达标候选中选择体积最小的
4. 如果没有质量评分，则选择体积最小的候选
5. 如果所有候选都比原图大，返回原图，并设置 strategy: "original-kept"
```

质量阈值：

```ts
export const ssimThresholds = {
  high: 0.985,
  balanced: 0.970,
  small: 0.940,
  extreme: 0.900
} as const;
```

---

## 15. 质量评分

尽量实现轻量 SSIM。

```ts
export function calculateSsim(
  original: ImageData,
  compressed: ImageData
): number;
```

如果短期无法完整实现，也必须：

```txt
保留 calculateSsim 接口
候选比较逻辑兼容 qualityScore
在 TODO 中说明后续实现方式
不能因为 SSIM 未完成导致压缩不可用
```

---

## 16. Worker 要求

压缩必须放到 Web Worker 中执行。

请实现：

```txt
compress.worker.ts
worker-pool.ts
```

### 16.1 Worker 消息格式

```ts
export interface CompressWorkerRequest {
  id: string;
  fileName: string;
  mimeType: string;
  buffer: ArrayBuffer;
  mode: CompressionMode;
  allowConvertToWebp: boolean;
  allowKeepOriginal: boolean;
}

export interface CompressWorkerSuccessResponse {
  id: string;
  ok: true;
  fileName: string;
  result: CompressResult;
}

export interface CompressWorkerErrorResponse {
  id: string;
  ok: false;
  error: string;
}
```

### 16.2 Worker 示例逻辑

```ts
self.onmessage = async event => {
  const {
    id,
    fileName,
    mimeType,
    buffer,
    mode,
    allowConvertToWebp
  } = event.data;

  try {
    const input = new Uint8Array(buffer);
    let result: CompressResult;

    if (mimeType === "image/png") {
      result = await compressPngBest(input, {
        mode,
        allowConvertToWebp,
        allowKeepOriginal: true
      });
    } else if (mimeType === "image/jpeg") {
      result = await compressJpegBest(input, {
        mode,
        allowConvertToWebp,
        allowKeepOriginal: true
      });
    } else if (mimeType === "image/webp") {
      result = await compressWebpBest(input, {
        mode,
        allowKeepOriginal: true
      });
    } else {
      throw new Error("Unsupported image type");
    }

    self.postMessage(
      {
        id,
        ok: true,
        fileName,
        result
      },
      [result.buffer]
    );
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "Compress failed"
    });
  }
};
```

### 16.3 Worker 要求

```txt
必须使用 transferable object 传递 ArrayBuffer
必须捕获错误并返回 UI
Worker 失败不能导致 UI 无响应
压缩期间 UI 必须显示 loading 状态
批量压缩建议并发数为 2
```

---

## 17. 兜底策略

任何压缩链路失败时，不要导致整个插件不可用。

兜底顺序：

```txt
专业 WASM 编码器
 ↓ 失败
可运行的 JS 编码器
 ↓ 失败
Canvas fallback
 ↓ 失败
返回原图并提示失败原因
```

注意：

```txt
Canvas fallback 只能作为兜底，不要作为默认主路径。
```

---

## 18. UI 设计要求

### 18.1 整体风格

继续使用 Element Plus，但需要通过样式覆盖，把视觉改造成接近：

```txt
Ant Design Pro
Squoosh
TinyPNG
专业图片工具
前端开发工具台
```

设计关键词：

```txt
简约
扁平
清晰
专业
工具感
高效
克制
```

不要：

```txt
花哨渐变
卡通风格
厚重阴影
大面积高饱和色块
Element Plus 默认粗糙后台感
过度圆角
杂乱表单堆叠
```

整体页面要像一个专业的前端资源处理工具，而不是普通上传表单。

---

### 18.2 主题变量要求

请新增或复用全局主题样式文件：

```txt
src/styles/theme.css
src/styles/layout.css
```

如果项目已有统一样式文件，请在现有结构中合并。

建议设置 Element Plus CSS Variables：

```css
:root {
  --el-color-primary: #1677ff;
  --el-color-primary-light-9: #e6f4ff;
  --el-border-radius-base: 6px;
  --el-border-color: #e5e7eb;
  --el-border-color-light: #edf0f5;
  --el-fill-color-light: #f5f7fa;
  --el-fill-color-lighter: #f7f8fa;
  --el-text-color-primary: #1f2329;
  --el-text-color-regular: #374151;
  --el-text-color-secondary: #6b7280;
  --el-text-color-placeholder: #9ca3af;
}
```

页面基础颜色：

```txt
页面背景：#f5f7fa / #f7f8fa
主卡片背景：#ffffff
主色：#1677ff
成功色：#16a34a
警告色：#f59e0b
危险色：#ef4444
边框色：#e5e7eb
弱边框：#edf0f5
标题文字：#1f2329
正文文字：#374151
辅助文字：#6b7280
说明文字：#9ca3af
```

阴影要求：

```txt
尽量少用阴影
优先使用 1px border 区分区域
如需阴影，使用 0 1px 2px rgba(0, 0, 0, 0.04)
不要使用厚重卡片阴影
```

---

### 18.3 页面整体布局

图片压缩工具页面采用专业工具布局：

```txt
顶部 Header
主体工作区
左侧上传与设置区
中间压缩队列区
右侧统计与批量操作区
```

推荐布局：

```txt
┌──────────────────────────────────────────────┐
│ Header：图片压缩 / 本地压缩 / 操作按钮        │
├──────────────┬───────────────────┬───────────┤
│ 左侧设置区    │ 中间文件队列        │ 右侧统计区 │
│ 280px        │ auto              │ 300px     │
└──────────────┴───────────────────┴───────────┘
```

尺寸建议：

```txt
Header 高度：56px
左侧面板：280px
右侧面板：300px 到 320px
主体高度：calc(100vh - 56px)
区域间距：12px 或 16px
卡片圆角：8px 到 12px
按钮高度：32px 或 36px
输入框高度：32px
```

响应式要求：

```txt
宽度不足时，右侧统计区可以下移或折叠
中间压缩队列优先保留空间
左侧设置区可以变成顶部折叠面板
不要因为窄屏导致按钮换行混乱
```

---

### 18.4 Header 设计

顶部 Header 要简洁专业。

左侧：

```txt
标题：图片压缩
副标题：本地压缩 PNG / JPEG / WebP，尽量保持画质并减少体积
```

右侧主操作：

```txt
上传图片
压缩全部
下载全部
清空列表
```

按钮规则：

```txt
上传图片：primary
压缩全部：primary 或普通按钮，视当前状态决定
下载全部：success 或 primary plain
清空列表：普通按钮或 text danger
```

Header 样式：

```txt
白色背景
底部 1px border
标题 16px / 18px，font-weight 600
副标题 12px / 13px，颜色 #6b7280
右侧按钮间距 8px
```

---

### 18.5 左侧上传与设置区

左侧分为两个卡片：

```txt
上传图片
压缩设置
```

#### 上传卡片

上传区域参考 TinyPNG，但保持专业工具风格：

```txt
大面积虚线边框
浅蓝 hover 状态
居中上传图标
主文案清楚
副文案强调本地处理
```

文案：

```txt
拖拽图片到这里，或点击上传
支持 PNG、JPEG、WebP；所有压缩都在浏览器本地完成
```

样式建议：

```txt
边框：1px dashed #cbd5e1
hover 边框：#1677ff
hover 背景：#f0f7ff
圆角：10px
高度：160px 到 200px
图标颜色：#1677ff
主文案：14px，font-weight 500
副文案：12px，#6b7280
```

拖拽悬停状态：

```txt
背景变为 #e6f4ff
边框变为 #1677ff
显示“释放鼠标开始添加图片”
```

#### 设置卡片

分组展示：

```txt
压缩模式
格式策略
质量策略
安全策略
```

必须包含：

```txt
压缩模式：高清 / 均衡 / 小体积 / 极限
允许转 WebP
优先保留原格式
压缩后更大时保留原图
```

Element Plus 组件建议：

```txt
el-segmented 或 el-radio-group 用于模式选择
el-switch 用于布尔选项
el-tooltip 展示说明
el-alert 展示隐私说明
```

设置区视觉：

```txt
label 13px，颜色 #374151
说明 12px，颜色 #6b7280
表单项上下间距 12px
分割线使用 1px #edf0f5
```

隐私提示：

```txt
所有压缩都在当前浏览器本地完成，不会上传服务器。
```

样式使用轻量 `el-alert`：

```txt
type="info"
show-icon
closable=false
背景尽量浅，不要抢视觉
```

---

### 18.6 中间压缩队列区

这是页面核心区域。

顶部工具条：

```txt
已添加 12 张图片
总大小 8.4 MB
预计节省 / 实际节省
右侧：排序 / 筛选 / 重新压缩
```

队列空状态：

```txt
居中显示 el-empty
标题：还没有图片
说明：上传图片后会在这里显示压缩队列和结果
按钮：上传图片
```

队列列表推荐使用自定义列表，不建议直接使用过重的 el-table。

每个文件项使用紧凑卡片或列表项：

```txt
缩略图
文件名
原始格式与尺寸，如果能读取
原始大小
压缩后大小
节省百分比
输出格式
压缩策略
状态
操作按钮
```

列表项布局：

```txt
左侧缩略图：56px x 56px
中间信息：文件名、大小变化、策略
右侧结果：节省百分比、下载、删除
```

文件项样式：

```txt
白色背景
1px border #edf0f5
圆角 8px
padding 12px
hover 背景 #fafafa
选中或成功状态可以加左侧 3px 蓝色或绿色竖线
```

状态标签：

```txt
等待压缩：灰色
压缩中：蓝色
已压缩：绿色
已跳过：橙色
失败：红色
```

使用 el-tag：

```txt
size="small"
effect="light"
```

进度展示：

```txt
压缩中显示 el-progress
高度尽量细
不要使用过大的圆形进度
```

---

### 18.7 压缩结果视觉

压缩成功后，突出展示节省比例。

推荐样式：

```txt
节省 68%
1.2 MB → 384 KB
WebP
png-to-webp
```

节省比例颜色规则：

```txt
>= 50%：绿色 #16a34a
20% - 50%：蓝色 #1677ff
1% - 20%：橙色 #f59e0b
<= 0% 或保留原图：灰色 #6b7280
失败：红色 #ef4444
```

可以实现：

```ts
export function getSavedPercentClass(savedPercent: number): string;
```

显示规则：

```txt
如果 result.strategy === "original-kept"，显示“已接近最优”
如果 savedPercent <= 0，显示“未变小”
如果失败，显示失败原因
```

---

### 18.8 右侧统计与批量操作区

右侧固定统计卡片。

统计信息：

```txt
图片数量
已完成数量
失败数量
原始总大小
压缩后总大小
总节省体积
总节省百分比
```

视觉建议：

```txt
使用数字统计卡片
大数字 20px / 24px，font-weight 600
说明文字 12px，#6b7280
统计项之间使用 1px 分割线
```

批量操作：

```txt
压缩全部
下载全部 ZIP
重新压缩失败项
清空列表
```

下载 ZIP 按钮要明显：

```txt
type="primary"
宽度 100%
高度 36px
```

如果没有可下载内容，按钮 disabled。

右侧还可以显示策略说明：

```txt
当前模式：均衡
允许转 WebP：开启
图片更大时：保留原图
```

---

### 18.9 ZIP 下载区域

下载全部按钮下方显示导出说明：

```txt
下载内容：
compressed-images.zip
/images
/manifest.json
```

当有结果时显示：

```txt
共 12 张，成功 11 张，失败 1 张
预计 ZIP 大小：约 3.2 MB
```

---

### 18.10 图片预览与对比，P2 可做

如果有时间可以做轻量预览弹窗。

点击缩略图打开 Dialog：

```txt
左侧原图
右侧压缩图
原始大小
压缩后大小
节省比例
格式
策略
```

P2 可以增加滑动对比，但不是 P0 必须。

---

### 18.11 Element Plus 组件样式统一

请统一 Element Plus 组件视觉：

```txt
el-button 高度 32px 或 36px
el-input 高度 32px
el-select 高度 32px
el-card 去掉厚重阴影，使用 border
el-radio-button 不要太厚重
el-switch 使用主色 #1677ff
el-progress 使用细线风格
el-tag 使用 light 风格
el-dialog 圆角 10px
```

建议添加全局样式：

```css
.el-card {
  border: 1px solid #edf0f5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.el-button {
  border-radius: 6px;
}

.el-button + .el-button {
  margin-left: 8px;
}

.el-input__wrapper,
.el-select__wrapper {
  border-radius: 6px;
}
```

注意：

```txt
不要全局覆盖得太激进，避免影响现有切图工具。
如果担心影响全局，请把样式限定在 .image-compressor-page 下。
```

---

### 18.12 页面 class 命名建议

请使用清晰的 BEM 或语义化 class：

```txt
.image-compressor-page
.compressor-header
.compressor-layout
.compressor-sidebar
.compressor-main
.compressor-inspector
.compressor-upload
.compressor-settings
.compressor-queue
.compressor-file-item
.compressor-file-thumb
.compressor-file-meta
.compressor-file-result
.compressor-stats-card
.compressor-actions
```

---

### 18.13 交互状态要求

必须覆盖以下状态：

```txt
空队列
拖拽悬停
文件不支持
等待压缩
压缩中
压缩成功
压缩后更大，保留原图
压缩失败
下载中
ZIP 生成中
```

每个状态都要有明确视觉反馈。

---

### 18.14 UI 实现原则

```txt
不要为了样式重写业务逻辑
不要破坏现有切图工具样式
尽量复用前面工具页的 Ant Design Pro 风格规范
优先通过 CSS variables、class、scoped style 改造
复杂样式可以放到 ImageCompressorPage.vue scoped style
通用主题放到 src/styles/theme.css
布局样式放到 src/styles/layout.css 或 image-compressor/style.css
```

---

### 18.15 UI 验收标准

必须满足：

```txt
页面整体简洁，接近 Ant Design Pro 工具型后台风格
上传区域接近 TinyPNG 的直观体验
压缩队列信息清楚
结果数字醒目
压缩状态清晰
批量下载操作明显
Element Plus 默认粗糙感被弱化
没有厚重阴影和杂乱色块
窄屏下布局不崩坏
```


## 19. 文件名规则

输出文件名规则：

```txt
原文件名.tiny.扩展名
```

示例：

```txt
banner.png -> banner.tiny.png
photo.jpg -> photo.tiny.webp
icon.webp -> icon.tiny.webp
```

如果保持原格式，扩展名对应原格式。

如果自动选择 WebP，扩展名为 `.webp`。

请实现：

```ts
export function generateCompressedFileName(
  originalFileName: string,
  extension: string
): string;
```

---

## 20. ZIP 导出

请实现：

```ts
export async function exportCompressedImagesToZip(
  items: CompressFileItem[]
): Promise<Blob>;
```

要求：

```txt
只导出 success 或 skipped 且有 result 的图片
文件放入 images/ 目录
生成 manifest.json
避免重复文件名
ZIP 名称 compressed-images.zip
```

manifest.json 示例：

```json
[
  {
    "originalName": "banner.png",
    "outputName": "banner.tiny.webp",
    "originalSize": 1258291,
    "compressedSize": 392118,
    "savedPercent": 68.84,
    "mimeType": "image/webp",
    "strategy": "png-to-webp"
  }
]
```

---

## 21. 工具函数要求

请实现：

```ts
export function formatBytes(bytes: number): string;

export function calculateSavedPercent(
  originalSize: number,
  compressedSize: number
): number;

export function isSupportedImageType(mimeType: string): mimeType is SupportedImageMimeType;

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer>;

export function createObjectUrlFromResult(result: CompressResult): string;

export function revokeObjectUrl(url?: string): void;
```

---

## 22. Vue 3 实现约定

请使用 Vue 3 Composition API。

组件使用：

```vue
<script setup lang="ts">
</script>
```

建议：

```txt
状态管理可以使用 ref / computed
如果已有 Pinia，可使用 Pinia
压缩核心逻辑不要写死在组件里
Worker 通信放到 composable 或 worker-pool
UI 组件只负责展示和触发动作
```

建议新增 composable：

```txt
useImageCompressor.ts
```

职责：

```txt
维护图片队列
添加文件
删除文件
压缩单个
压缩全部
下载单个
下载全部 ZIP
清理 ObjectURL
```

---

## 23. Element Plus 组件建议

可使用：

```txt
el-upload
el-button
el-radio-group
el-switch
el-table
el-tag
el-progress
el-card
el-alert
el-tooltip
el-empty
el-dialog
```

注意：

```txt
不要完全依赖 el-upload 自动上传逻辑
这里是本地处理，不要发请求
请使用 before-upload 或自定义上传处理
```

---

## 24. 推荐页面文案

### 24.1 标题

```txt
图片压缩
```

### 24.2 副标题

```txt
本地压缩 PNG、JPEG、WebP，尽量保持画质并显著减少体积
```

### 24.3 上传区

```txt
拖拽图片到这里，或点击上传
支持 PNG、JPEG、WebP；所有压缩都在浏览器本地完成
```

### 24.4 设置区

```txt
压缩模式
允许转 WebP
保留原格式
图片已优化时保留原图
```

### 24.5 空状态

```txt
还没有图片
上传图片后会自动显示压缩结果
```

### 24.6 已优化提示

```txt
图片可能已经被优化过，已保留原图
```

### 24.7 失败提示

```txt
压缩失败，请尝试更换压缩模式或保留原格式
```

---

## 25. 性能要求

必须满足：

```txt
压缩在 Worker 中执行
UI 主线程不能卡死
大图压缩期间显示压缩中
批量压缩并发数建议限制为 2
压缩完成后及时 revokeObjectURL
清空列表时释放所有 ObjectURL
组件卸载时释放 ObjectURL
传输 ArrayBuffer 使用 transferable object
```

---

## 26. 错误处理

必须处理：

```txt
不支持的文件类型
文件过大
图片解码失败
WASM 编码器加载失败
Worker 执行失败
压缩结果比原图更大
ZIP 生成失败
下载失败
```

错误展示：

```txt
单个图片失败时，不影响其他图片
失败项显示错误原因
整体页面不崩溃
```

---

## 27. 验收标准

### 27.1 基础功能

必须满足：

```txt
可以上传 PNG
可以上传 JPEG
可以上传 WebP
可以批量上传
可以本地压缩
可以显示压缩前大小
可以显示压缩后大小
可以显示节省比例
可以显示输出格式
可以显示压缩策略
可以下载单张结果
可以批量下载 ZIP
```

### 27.2 技术验收

必须满足：

```txt
压缩任务在 Web Worker 中执行
使用 transferable object 传递 ArrayBuffer
主线程不明显卡顿
不上传图片到服务器
不依赖远程 CDN
Manifest V3 可用
npm run build 通过
Chrome 扩展管理页可以加载 dist
```

### 27.3 压缩效果验收

必须满足：

```txt
PNG 图片可以被压缩
JPEG 图片可以被压缩
WebP 图片可以被压缩
JPEG 主路径不要只用 canvas.toBlob
PNG 主路径不要只用 canvas.toBlob
WebP 主路径尽量使用 WASM 编码器
已优化图片不能输出更大的文件
如果所有候选都更大，应保留原图并提示
```

### 27.4 UI 验收

必须满足：

```txt
页面风格和现有插件保持一致
上传区域清晰
压缩列表清晰
状态反馈明确
下载操作明显
失败提示友好
移动窗口或窄屏时布局不崩坏
```

---

## 28. 开发优先级

### P0：必须完成

```txt
新增图片压缩工具入口
图片上传
图片队列
压缩设置
Web Worker 压缩框架
PNG / JPEG / WebP 基础压缩
压缩结果展示
单图下载
批量 ZIP 下载
错误处理
npm run build 通过
```

### P1：强烈建议完成

```txt
WASM 编码器接入
候选结果比较
allowConvertToWebp
original-kept 策略
压缩模式 preset
Worker Pool 并发限制
manifest.json 导出
ObjectURL 内存清理
```

### P2：后续增强

```txt
SSIM 质量评分
PNG perceptual quantization
图片预览对比
压缩前后滑动对比
批量压缩进度
压缩历史记录
```

### P3：高级增强

```txt
AVIF 输出
自定义 quality
自定义最大宽高
EXIF 保留 / 移除选项
自动识别照片型 PNG 并推荐 WebP
```

---

## 29. 推荐开发顺序

请 Codex 按以下顺序实现：

```txt
1. 检查现有项目结构和工具入口
2. 新增 ImageCompressorPage.vue
3. 在工具首页新增图片压缩入口
4. 新增 image-compressor/types.ts
5. 新增 compressionPresets
6. 新增上传和队列 UI
7. 新增 formatBytes / naming 等工具函数
8. 新增 compress.worker.ts
9. 新增 worker-pool.ts
10. 新增 PNG / JPEG / WebP codec 适配层
11. 实现 compressPngBest
12. 实现 compressJpegBest
13. 实现 compressWebpBest
14. 实现 pickBestCandidate
15. 接入 UI 压缩流程
16. 实现单图下载
17. 实现 ZIP 批量下载
18. 实现 manifest.json
19. 优化错误处理和 loading 状态
20. npm run build 并修复构建问题
21. 输出修改文件、依赖和使用说明
```

---


UI 改造特别要求：

```txt
新增图片压缩工具时，请同时完成 UI 风格统一。
整体风格参考前面图片切图工具的 Ant Design Pro 式简约扁平设计。
继续使用 Element Plus，但需要通过 CSS variables 和局部 class 弱化默认样式。
重点优化上传区、压缩设置、压缩队列、统计面板和批量下载区域。
```

## 30. 重要限制

请严格遵守：

```txt
不要上传图片到服务器
不要调用远程压缩 API
不要从 CDN 加载编码器
不要使用 eval / 远程 JS
不要让 Canvas 成为唯一压缩路径
不要破坏现有切图工具
不要重写整个插件
不要引入 Ant Design Vue
```

---

## 31. 完成后请输出

请在任务完成后向我说明：

```txt
1. 修改过的文件列表
2. 新增依赖列表
3. 核心压缩 pipeline 说明
4. Worker 如何工作
5. 如何运行开发环境
6. 如何 build
7. 如何在 Chrome 中加载插件
8. 已知限制
9. 如果某个 WASM 编码器无法接入，请说明原因
10. 后续可以继续优化的点
```

---

## 32. 给 Codex 的执行提示

请按以下原则执行：

```txt
优先保证压缩效果和稳定性
优先使用 WASM 编码器
Canvas 只能作为 fallback
所有压缩逻辑必须本地执行
压缩任务必须进入 Worker
批量压缩不要阻塞 UI
不要破坏现有功能
不要为了 UI 改造牺牲核心压缩效果
```

最终目标：

> 将当前 Chrome 插件升级为包含高质量本地图片压缩能力的前端工具插件，压缩体验尽量接近 TinyPNG，技术实现尽量接近 Squoosh 的本地 WASM pipeline。
