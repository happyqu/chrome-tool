# Chrome 插件：前端图片切图工具开发说明

## 1. 项目背景

本工具是一个 Chrome 插件中的子工具，定位为 **面向前端开发者的图片切图与资源导出工具**。

用户可以上传一张图片、页面截图、设计稿截图或素材合集图片，然后通过自动分割或手动框选的方式裁剪图片区域，最终批量导出为 ZIP 包，用于前端项目开发。

工具不只是普通图片裁剪器，而是一个更偏向前端资源处理的「切图助手」。

---

## 2. 核心目标

实现一个 Chrome 插件工具页面，支持：

1. 上传图片并在画布中预览。
2. 手动框选图片区域进行裁剪。
3. 支持自动分割图片区域。
4. 支持批量导出裁剪后的图片。
5. 支持 ZIP 打包下载。
6. 支持导出 `manifest.json`，记录每个切片的坐标、尺寸和文件名。
7. 支持前端友好的文件命名、格式转换和基础资源信息生成。

---

## 3. 技术栈建议

建议使用：

```txt
Chrome Extension Manifest V3
Vue 3
TypeScript
Vite
Pinia 可选
VueUse 可选
Canvas API
JSZip
FileSaver
```

推荐依赖：

```bash
npm install jszip file-saver
npm install -D @types/file-saver
```

推荐 Vue 相关依赖：

```bash
npm install vue
npm install pinia @vueuse/core
npm install -D @vitejs/plugin-vue vue-tsc
```

说明：

```txt
Pinia 用于较复杂的切片状态管理，可选
VueUse 可用于快捷处理剪贴板、拖拽、事件监听等，可选
如果希望保持轻量，MVP 可以只使用 Vue 3 Composition API
```

可选增强：

```txt
OffscreenCanvas
Web Worker
OpenCV.js
```

第一版不强制使用 OpenCV.js。

---

## 4. 推荐目录结构

```txt
chrome-tools-extension/
├── manifest.json
├── package.json
├── vite.config.ts
├── src/
│   ├── popup/
│   │   ├── Popup.vue
│   │   └── popup.html
│   ├── tools/
│   │   └── image-slicer/
│   │       ├── ImageSlicerPage.vue
│   │       ├── components/
│   │       │   ├── CanvasStage.vue
│   │       │   ├── SliceToolbar.vue
│   │       │   ├── SliceList.vue
│   │       │   ├── ExportPanel.vue
│   │       │   └── UploadPanel.vue
│   │       ├── core/
│   │       │   ├── autoSlice.ts
│   │       │   ├── crop.ts
│   │       │   ├── exportZip.ts
│   │       │   ├── imageUtils.ts
│   │       │   ├── naming.ts
│   │       │   └── format.ts
│   │       ├── hooks/
│   │       │   ├── useImageLoader.ts
│   │       │   ├── useSlices.ts
│   │       │   └── useCanvasTransform.ts
│   │       └── types.ts
│   ├── background/
│   │   └── serviceWorker.ts
│   └── shared/
│       ├── utils.ts
│       └── constants.ts
└── public/
```

---

## 5. 页面布局

图片切图工具建议做成独立页面，不建议只放在 popup 中。

页面结构：

```txt
顶部工具栏
左侧设置面板
中间画布区域
右侧切片列表
底部导出栏
```

### 5.1 顶部工具栏

包含：

```txt
上传图片
粘贴图片
手动裁剪
自动分割
网格分割
固定尺寸分割
撤销
重做
缩放
重置视图
导出 ZIP
```

### 5.2 左侧设置面板

包含：

```txt
分割模式
输出格式
输出质量
命名前缀
最小切片宽度
最小切片高度
是否导出 manifest.json
是否生成前端代码
```

### 5.3 中间画布区域

功能：

```txt
显示原始图片
显示裁剪框
支持拖拽创建裁剪框
支持移动裁剪框
支持缩放裁剪框
支持多选
支持删除
支持缩放画布
支持拖动画布
```

实现建议：

```txt
图片使用 canvas 渲染
裁剪框使用 HTML/SVG overlay 渲染
```

### 5.4 右侧切片列表

展示每个裁剪区域：

```txt
缩略图
文件名
坐标
尺寸
格式
选中状态
删除按钮
单独导出按钮
```

---

## 6. 核心数据结构

### 6.1 裁剪区域

```ts
export type SliceRect = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  locked?: boolean;
  format?: ImageOutputFormat;
};
```

### 6.2 图片状态

```ts
export type ImageState = {
  fileName: string;
  width: number;
  height: number;
  imageElement: HTMLImageElement;
  scale: number;
  offsetX: number;
  offsetY: number;
};
```

### 6.3 导出设置

```ts
export type ImageOutputFormat = "png" | "jpg" | "jpeg" | "webp" | "avif";

export type ExportOptions = {
  format: ImageOutputFormat;
  quality: number;
  scale: 1 | 2 | 3;
  includeManifest: boolean;
  includeReadme: boolean;
  includeCodeSnippets: boolean;
  zipName: string;
  fileNameTemplate: string;
};
```

### 6.4 manifest.json

```ts
export type SliceManifestItem = {
  id: string;
  name: string;
  file: string;
  x: number;
  y: number;
  width: number;
  height: number;
  format: ImageOutputFormat;
  scale: number;
};
```

---

## 7. MVP 功能范围

第一版优先实现以下功能。

### 7.1 图片上传

必须支持：

```txt
本地上传图片
拖拽上传图片
粘贴剪贴板图片
```

支持格式：

```txt
png
jpg
jpeg
webp
```

GIF 可以只处理第一帧。

### 7.2 手动裁剪

必须支持：

```txt
拖拽创建裁剪框
移动裁剪框
调整裁剪框大小
删除裁剪框
复制裁剪框
重命名裁剪框
显示坐标和尺寸
```

### 7.3 网格分割

用户输入：

```txt
行数
列数
水平间距
垂直间距
外边距
```

自动生成切片区域。

### 7.4 固定尺寸分割

用户输入：

```txt
切片宽度
切片高度
起始 x
起始 y
是否裁掉不足尺寸的边缘区域
```

自动按固定尺寸从左到右、从上到下切割。

### 7.5 空白区域自动分割

第一版实现基础版本即可。

逻辑：

1. 读取像素数据。
2. 识别连续空白行和空白列。
3. 根据空白区域切分图片。
4. 过滤过小区域。
5. 合并相邻区域。
6. 生成裁剪框。

建议配置项：

```txt
空白容差 threshold
最小区域宽度
最小区域高度
合并距离 mergeGap
忽略小区域 ignoreSmallArea
```

### 7.6 批量导出 ZIP

导出结构：

```txt
image-slices.zip
├── slices/
│   ├── slice-001.webp
│   ├── slice-002.webp
│   └── slice-003.webp
├── manifest.json
├── snippets/
│   ├── images.css
│   ├── images.ts
│   └── images.json
└── README.md
```

---

## 8. 自动分割算法说明

### 8.1 网格分割伪代码

```ts
export function sliceByGrid(
  imageWidth: number,
  imageHeight: number,
  rows: number,
  cols: number,
  gapX = 0,
  gapY = 0,
  padding = 0
): SliceRect[] {
  const availableWidth = imageWidth - padding * 2 - gapX * (cols - 1);
  const availableHeight = imageHeight - padding * 2 - gapY * (rows - 1);

  const cellWidth = Math.floor(availableWidth / cols);
  const cellHeight = Math.floor(availableHeight / rows);

  const rects: SliceRect[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rects.push({
        id: crypto.randomUUID(),
        name: `slice-${row + 1}-${col + 1}`,
        x: padding + col * (cellWidth + gapX),
        y: padding + row * (cellHeight + gapY),
        width: cellWidth,
        height: cellHeight,
        selected: false
      });
    }
  }

  return rects;
}
```

### 8.2 固定尺寸分割伪代码

```ts
export function sliceByFixedSize(
  imageWidth: number,
  imageHeight: number,
  sliceWidth: number,
  sliceHeight: number
): SliceRect[] {
  const rects: SliceRect[] = [];

  for (let y = 0; y < imageHeight; y += sliceHeight) {
    for (let x = 0; x < imageWidth; x += sliceWidth) {
      rects.push({
        id: crypto.randomUUID(),
        name: `slice-${rects.length + 1}`,
        x,
        y,
        width: Math.min(sliceWidth, imageWidth - x),
        height: Math.min(sliceHeight, imageHeight - y),
        selected: false
      });
    }
  }

  return rects;
}
```

### 8.3 空白区域分割伪代码

```ts
export function autoSliceByWhitespace(
  imageData: ImageData,
  options: {
    threshold: number;
    minWidth: number;
    minHeight: number;
    mergeGap: number;
  }
): SliceRect[] {
  const emptyRows = scanEmptyRows(imageData, options.threshold);
  const emptyCols = scanEmptyCols(imageData, options.threshold);

  const rowSegments = splitByEmptyLines(emptyRows, imageData.height);
  const colSegments = splitByEmptyLines(emptyCols, imageData.width);

  const rects: SliceRect[] = [];

  for (const row of rowSegments) {
    for (const col of colSegments) {
      const width = col.end - col.start;
      const height = row.end - row.start;

      if (width >= options.minWidth && height >= options.minHeight) {
        rects.push({
          id: crypto.randomUUID(),
          name: `slice-${rects.length + 1}`,
          x: col.start,
          y: row.start,
          width,
          height,
          selected: false
        });
      }
    }
  }

  return mergeNearbyRects(rects, options.mergeGap);
}
```

---

## 9. 导出功能要求

### 9.1 单个切片导出

每个切片支持单独下载。

输出格式：

```txt
png
jpg
jpeg
webp
avif
```

### 9.2 批量 ZIP 导出

使用 `JSZip` 生成 ZIP。

每个切片通过临时 canvas 裁剪生成 Blob。

核心流程：

```txt
遍历 SliceRect
创建离屏 canvas
drawImage 原图对应区域
canvas.toBlob 转换格式
写入 zip/slices/
生成 manifest.json
生成 README.md
生成前端代码片段
下载 ZIP
```

### 9.3 导出文件命名

支持命名模板：

```txt
{prefix}-{index}
{prefix}-{width}x{height}-{index}
{name}
{x}-{y}-{width}-{height}
```

示例：

```txt
home-banner-001.webp
icon-user-24x24.webp
card-product-320x480.webp
```

---

## 10. 前端代码生成

导出 ZIP 时可选生成代码片段。

### 10.1 CSS

生成 `snippets/images.css`：

```css
.image-home-banner {
  width: 1440px;
  height: 420px;
  background-image: url("../slices/home-banner.webp");
  background-size: cover;
}
```

### 10.2 HTML

生成 `snippets/images.html`：

```html
<img src="./slices/home-banner.webp" width="1440" height="420" alt="home banner" />
```

### 10.3 Vue 组件片段

生成 `snippets/images.vue`：

```vue
<template>
  <img
    src="/images/home-banner.webp"
    width="1440"
    height="420"
    alt="home banner"
  />
</template>
```

### 10.4 JSON

生成 `snippets/images.json`：

```json
[
  {
    "name": "home-banner",
    "src": "./slices/home-banner.webp",
    "width": 1440,
    "height": 420
  }
]
```

---

## 11. 前端增强功能

以下功能建议在 MVP 后继续实现。

### 11.1 图片压缩

支持：

```txt
PNG 压缩
JPG 质量调节
WebP 压缩
AVIF 压缩
显示压缩前后体积
```

切片列表中展示：

```txt
原始大小
压缩后大小
压缩比例
```

### 11.2 多倍图导出

支持：

```txt
@1x
@2x
@3x
```

示例：

```txt
icon-user.png
icon-user@2x.png
icon-user@3x.png
```

### 11.3 自动去白边 / 透明边

支持：

```txt
裁掉透明边
裁掉白边
裁掉指定纯色边
保留指定边距
```

### 11.4 颜色提取

支持：

```txt
点击取色
提取主色
生成调色板
复制 HEX / RGB / HSL
生成 CSS 变量
```

示例：

```css
:root {
  --color-primary: #1677ff;
  --color-bg: #f5f5f5;
}
```

### 11.5 Base64 / Data URI

支持：

```txt
复制 Base64
复制 Data URI
导出 base64.json
生成 CSS 变量
```

注意：大图不建议使用 Base64。

---

## 12. Chrome 插件增强功能

这些功能可以体现 Chrome 插件优势。

### 12.1 当前网页截图

支持：

```txt
截取当前可视区域
截取完整页面长图
导入到切图工具继续编辑
```

### 12.2 DOM 元素截图

用户打开网页后：

```txt
点击插件
进入元素选择模式
鼠标悬停高亮 DOM 元素
点击选中元素
生成该 DOM 元素截图
导入切图工具
```

导出信息：

```json
{
  "selector": ".product-card:nth-child(1)",
  "width": 320,
  "height": 480,
  "x": 120,
  "y": 240,
  "image": "product-card-01.webp"
}
```

### 12.3 CSS Selector 批量截图

支持输入 CSS Selector：

```txt
.logo
.product-card
.banner
button
```

批量导出对应 DOM 截图。

---

## 13. 高级功能规划

### 13.1 UI 元素智能识别

识别类型：

```txt
按钮
图标
头像
Banner
卡片
Logo
商品图
二维码
背景块
```

可用规则先实现：

```txt
小正方形区域 -> icon
大横向区域 -> banner
正方形大图 -> 商品图
圆形区域 -> avatar
高对比小方块 -> qrcode
```

### 13.2 Sprite 图生成

适合小图标合集。

导出：

```txt
sprite.png
sprite.css
sprite.json
```

CSS 示例：

```css
.icon-search {
  width: 24px;
  height: 24px;
  background-image: url("./sprite.png");
  background-position: 0 0;
}
```

### 13.3 图片规范检查

支持配置规则：

```json
{
  "banner": {
    "width": 1440,
    "height": 420,
    "maxSize": "300KB",
    "format": "webp"
  },
  "icon": {
    "sizes": [16, 24, 32, 48],
    "format": "png"
  }
}
```

检查结果示例：

```txt
banner-home.webp 通过
product-01.png 文件过大，建议压缩
icon-user.png 尺寸 30x30，建议调整为 32x32
```

### 13.4 项目保存

支持：

```txt
保存当前切图项目
恢复上次编辑
导入 manifest.json 继续编辑
保存裁剪框配置
```

保存结构：

```json
{
  "imageName": "home-page.png",
  "imageSize": {
    "width": 1440,
    "height": 3200
  },
  "slices": []
}
```

---

## 14. 交互细节要求

### 14.1 裁剪框交互

必须支持：

```txt
拖拽创建
拖拽移动
八方向缩放
键盘 Delete 删除
方向键微调位置
Shift + 方向键快速移动
Esc 取消选择
Ctrl / Cmd + Z 撤销
Ctrl / Cmd + Shift + Z 重做
```

### 14.2 画布交互

必须支持：

```txt
鼠标滚轮缩放
空格键 + 拖拽平移
双击重置视图
显示当前缩放比例
显示鼠标所在坐标
```

### 14.3 辅助线

建议支持：

```txt
画布标尺
参考线
吸附到图片边缘
吸附到其他裁剪框边缘
显示切片尺寸
```

---

## 15. 组件职责说明

### 15.1 ImageSlicerPage.vue

职责：

```txt
组合整体页面
维护全局状态
处理上传、分割、导出
连接各个子组件
```

### 15.2 CanvasStage.vue

职责：

```txt
渲染图片
渲染裁剪框
处理鼠标交互
处理缩放和平移
处理手动框选
```

### 15.3 SliceToolbar.vue

职责：

```txt
上传入口
模式切换
撤销重做
缩放控制
自动分割入口
导出入口
```

### 15.4 SliceList.vue

职责：

```txt
展示切片列表
选择切片
重命名切片
删除切片
单独导出切片
```

### 15.5 ExportPanel.vue

职责：

```txt
选择导出格式
设置质量
设置命名模板
选择是否导出 manifest
选择是否导出代码片段
触发 ZIP 导出
```

---

## 15.6 Vue 3 实现约定

请使用 Vue 3 Composition API 编写组件。

建议约定：

```txt
组件使用 <script setup lang="ts">
类型定义统一放在 types.ts
图片、切片、导出配置等复杂逻辑尽量抽到 composables 和 core 函数中
CanvasStage.vue 只负责渲染和交互，不直接处理 ZIP 导出
导出、裁剪、自动分割等纯逻辑放在 core/ 目录，便于测试
```

示例组件风格：

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import type { SliceRect, ExportOptions } from "./types";

const slices = ref<SliceRect[]>([]);
const selectedSliceIds = ref<string[]>([]);

const selectedSlices = computed(() =>
  slices.value.filter(slice => selectedSliceIds.value.includes(slice.id))
);
</script>

<template>
  <div class="image-slicer-page">
    <!-- toolbar / canvas / panels -->
  </div>
</template>
```

## 16. 核心函数清单

请至少实现以下核心函数。

### 16.1 图片加载

```ts
export async function loadImageFromFile(file: File): Promise<HTMLImageElement>;
export async function loadImageFromClipboard(): Promise<File | null>;
```

### 16.2 裁剪

```ts
export async function cropImageToBlob(
  image: HTMLImageElement,
  rect: SliceRect,
  options: ExportOptions
): Promise<Blob>;
```

### 16.3 自动分割

```ts
export function sliceByGrid(...): SliceRect[];
export function sliceByFixedSize(...): SliceRect[];
export function autoSliceByWhitespace(...): SliceRect[];
```

### 16.4 ZIP 导出

```ts
export async function exportSlicesToZip(
  image: HTMLImageElement,
  slices: SliceRect[],
  options: ExportOptions
): Promise<Blob>;
```

### 16.5 命名

```ts
export function generateSliceFileName(
  slice: SliceRect,
  index: number,
  options: ExportOptions
): string;
```

### 16.6 代码生成

```ts
export function generateCssSnippets(slices: SliceManifestItem[]): string;
export function generateHtmlSnippets(slices: SliceManifestItem[]): string;
export function generateVue 3Snippets(slices: SliceManifestItem[]): string;
export function generateJsonSnippets(slices: SliceManifestItem[]): string;
```

---

## 17. Chrome Extension Manifest 要求

Manifest V3 示例：

```json
{
  "manifest_version": 3,
  "name": "Frontend Tools",
  "version": "0.1.0",
  "description": "A collection of frontend tools including image slicing.",
  "permissions": [
    "activeTab",
    "scripting",
    "downloads",
    "storage"
  ],
  "action": {
    "default_popup": "src/popup/popup.html"
  },
  "background": {
    "service_worker": "src/background/serviceWorker.ts"
  }
}
```

如果要做网页截图，后续需要：

```txt
activeTab
scripting
tabs
```

---

## 18. 验收标准

### 18.1 基础验收

必须满足：

```txt
可以上传 png/jpg/webp 图片
图片可以正常显示在画布中
可以手动框选至少一个裁剪区域
裁剪区域可以移动和缩放
裁剪区域可以删除
可以通过网格方式自动生成多个裁剪区域
可以通过固定尺寸方式自动生成多个裁剪区域
可以导出 ZIP
ZIP 中包含所有裁剪图片
ZIP 中包含 manifest.json
导出的图片尺寸与裁剪区域一致
```

### 18.2 导出验收

必须满足：

```txt
导出 PNG 正常
导出 JPG/JPEG 正常
导出 WebP 正常
文件名符合模板
manifest.json 坐标、尺寸、文件路径正确
ZIP 可以正常解压
```

### 18.3 交互验收

必须满足：

```txt
拖拽创建裁剪框流畅
拖拽移动裁剪框流畅
缩放图片后裁剪坐标仍然正确
画布平移后裁剪坐标仍然正确
裁剪框不能超出图片边界
删除裁剪框不会影响其他区域
```

---

## 19. 开发优先级

### P0：必须完成

```txt
插件基础结构
工具页面
图片上传
图片预览
手动裁剪
网格分割
固定尺寸分割
ZIP 导出
manifest.json
```

### P1：强烈建议完成

```txt
空白区域自动分割
WebP 导出
批量重命名
代码片段生成
缩放和平移画布
撤销重做
```

### P2：后续增强

```txt
图片压缩
@1x / @2x / @3x
当前网页截图
DOM 元素截图
自动去白边
颜色提取
Base64 导出
```

### P3：高级能力

```txt
智能识别 UI 元素
Sprite 图生成
图片规范检查
项目保存
批量处理
透明背景处理
```

---

## 20. 推荐开发顺序

建议 Codex 按以下顺序实现：

1. 初始化 Chrome Extension + Vue 3 + TypeScript + Vite 项目。
2. 创建 popup 工具入口。
3. 创建 image-slicer 独立工具页面。
4. 实现图片上传和画布预览。
5. 实现 SliceRect 数据结构和状态管理。
6. 实现手动创建裁剪框。
7. 实现裁剪框移动、缩放、删除。
8. 实现网格分割。
9. 实现固定尺寸分割。
10. 实现单个切片裁剪导出。
11. 实现 JSZip 批量导出。
12. 实现 manifest.json。
13. 实现输出格式选择。
14. 实现文件命名模板。
15. 实现代码片段生成。
16. 实现空白区域自动分割。
17. 优化交互体验和边界处理。
18. 补充 README 和基础测试。

---

## 21. 注意事项

1. 裁剪坐标必须始终基于原图真实像素，而不是画布缩放后的视觉坐标。
2. 画布缩放和平移只影响显示，不应该改变 SliceRect 的真实坐标。
3. 导出图片时需要处理 devicePixelRatio 和缩放倍率。
4. JPG/JPEG 不支持透明背景，透明区域需要填充白色或用户指定背景色。
5. WebP 兼容性较好，可以作为默认推荐导出格式。
6. AVIF 可作为后续增强，不作为 MVP 强制要求。
7. Chrome 插件中尽量避免远程代码依赖，构建产物应全部本地化。
8. 大图片处理可能卡顿，后续可以迁移到 Web Worker 或 OffscreenCanvas。
9. 自动分割算法第一版允许不完美，但必须允许用户手动调整。
10. ZIP 导出时需要避免空切片、超出边界切片和重复文件名。

---

## 22. 最终产品定位

一句话定位：

> 一个专门给前端开发者使用的 Chrome 图片切图插件，可以从截图、设计图或素材图中快速生成可用的前端图片资源包。

核心卖点：

```txt
上传即切
自动分割
手动精修
批量导出 ZIP
生成 manifest.json
生成前端代码片段
支持 WebP
适合前端页面开发
```
