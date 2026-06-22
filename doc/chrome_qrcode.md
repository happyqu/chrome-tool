# 新增二维码解码工具

## 任务背景

当前项目是一个 Chrome 插件工具集合，已经包含图片裁剪、图片压缩等工具，并计划新增二维码生成工具。

现在需要在二维码工具中新增「二维码解码」功能，用于识别二维码图片内容，并对识别结果进行智能展示和快捷操作。

请基于现有项目结构、Vue3、TypeScript、Element Plus 实现该功能，UI 风格保持与现有工具一致，整体参考 Ant Design Pro 的简约、扁平、工具型设计风格。

---

## 一、开发目标

新增一个二维码解码模块，支持用户通过以下方式识别二维码：

1. 上传二维码图片识别
2. 拖拽二维码图片识别
3. Ctrl + V 粘贴截图识别
4. 识别结果智能分类展示
5. URL / Wi-Fi / vCard / JSON / 文本等内容结构化展示
6. 复制识别结果
7. URL 一键打开
8. Wi-Fi 密码单独复制
9. vCard 联系人信息复制
10. 识别失败后自动增强重试
11. 最近识别历史
12. 将识别结果一键带入二维码生成模块

---

## 二、技术要求

项目技术栈：

```bash
Vue 3
TypeScript
Vite
Element Plus
```

新增依赖：

```bash
npm install jsqr
```

第一版暂不需要摄像头扫码功能。

---

## 三、页面入口要求

在二维码工具页面中增加 Tab：

```txt
生成二维码
识别二维码
```

如果项目中已经有二维码工具页面，请在现有页面中新增解码 Tab。

如果还没有二维码工具页面，请新增页面：

```txt
src/views/tools/qr/index.vue
```

建议组件结构：

```txt
src/views/tools/qr/index.vue
src/views/tools/qr/components/QrDecoder.vue
src/views/tools/qr/components/QrDecodeUpload.vue
src/views/tools/qr/components/QrDecodeResult.vue
src/views/tools/qr/components/QrDecodeHistory.vue
```

新增工具函数：

```txt
src/utils/qrDecode.ts
src/utils/qrContentDetect.ts
src/utils/qrContentParser.ts
src/utils/qrImageEnhance.ts
```

如项目已有类似目录结构，请按现有规范调整路径。

---

## 四、页面布局要求

二维码解码页面采用左右分栏布局。

左侧：上传识别区域
右侧：识别结果区域
底部：最近识别历史

布局示意：

```txt
┌──────────────────────────────────────────────┐
│ 识别二维码                                    │
│ 上传、拖拽或粘贴二维码图片，快速解析内容        │
├───────────────────────┬──────────────────────┤
│ 上传区域               │ 识别结果              │
│                       │                      │
│ 拖拽二维码图片到这里    │ 类型：链接             │
│ 或点击上传              │ 内容：xxx             │
│ 支持 Ctrl + V 粘贴截图  │ 操作：复制 / 打开      │
│                       │                      │
│ 图片预览                │                      │
├───────────────────────┴──────────────────────┤
│ 最近识别记录                                  │
└──────────────────────────────────────────────┘
```

窄屏时改为上下布局。

---

## 五、UI 风格要求

整体风格需要和现有图片裁剪、图片压缩工具保持统一。

要求：

1. 背景使用浅灰色
2. 卡片使用白色背景
3. 圆角 10px - 14px
4. 轻量边框和阴影
5. 布局简洁清晰
6. 工具感强
7. 表单和按钮风格接近 Ant Design Pro
8. 不要使用复杂渐变和过度装饰

建议 CSS 变量：

```css
:root {
  --tool-bg: #f5f7fa;
  --tool-card-bg: #ffffff;
  --tool-border: #e5e7eb;
  --tool-text-main: #111827;
  --tool-text-secondary: #6b7280;
  --tool-primary: #1677ff;
  --tool-success: #10b981;
  --tool-warning: #f59e0b;
  --tool-error: #ef4444;
  --tool-radius: 12px;
}
```

页面样式参考：

```css
.qr-decode-page {
  padding: 20px;
  background: var(--tool-bg);
  min-height: 100%;
}

.qr-decode-header {
  margin-bottom: 16px;
}

.qr-decode-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--tool-text-main);
}

.qr-decode-desc {
  margin-top: 6px;
  color: var(--tool-text-secondary);
  font-size: 14px;
}

.qr-decode-layout {
  display: grid;
  grid-template-columns: minmax(360px, 480px) 1fr;
  gap: 16px;
}

.qr-decode-card {
  background: var(--tool-card-bg);
  border: 1px solid var(--tool-border);
  border-radius: var(--tool-radius);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

@media (max-width: 900px) {
  .qr-decode-layout {
    grid-template-columns: 1fr;
  }
}
```

---

## 六、上传识别功能

### 6.1 支持格式

支持以下图片格式：

```txt
PNG
JPG
JPEG
WEBP
GIF
```

第一版 GIF 只需要识别首帧即可。

### 6.2 文件大小限制

限制单张图片最大 10MB。

文件过大时提示：

```txt
图片文件过大，请上传 10MB 以内的图片。
```

### 6.3 上传区文案

上传区域文案：

```txt
拖拽二维码图片到这里，或点击上传
支持 PNG、JPG、JPEG、WEBP，也可以直接 Ctrl + V 粘贴截图
```

### 6.4 状态文案

需要支持以下状态：

```ts
type DecodeStatus = 'idle' | 'loading' | 'success' | 'failed'
```

对应文案：

```txt
idle：拖拽二维码图片到这里，或点击上传
loading：正在识别二维码...
success：识别成功
failed：未识别到二维码
```

---

## 七、拖拽识别

上传区域需要支持拖拽图片识别。

交互要求：

1. dragover 时上传区域高亮
2. dragleave 时取消高亮
3. drop 后自动识别图片
4. 如果拖入的不是图片，提示“请上传图片文件”

示例实现：

```ts
function handleDrop(event: DragEvent) {
  event.preventDefault()

  const files = Array.from(event.dataTransfer?.files || [])
  const imageFile = files.find(file => file.type.startsWith('image/'))

  if (!imageFile) {
    ElMessage.warning('请上传图片文件')
    return
  }

  handleDecodeFile(imageFile)
}
```

---

## 八、粘贴截图识别

支持用户复制截图后，在二维码解码页面直接按 `Ctrl + V` 识别。

实现要求：

1. 页面 mounted 时监听 paste 事件
2. 检测剪贴板中是否有图片
3. 如果有图片，自动执行解码
4. 页面卸载时移除监听

示例：

```ts
function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items || []

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()

      if (file) {
        handleDecodeFile(file)
      }
    }
  }
}

onMounted(() => {
  window.addEventListener('paste', handlePaste)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', handlePaste)
})
```

---

## 九、核心类型定义

新增或合并到项目现有类型文件中：

```ts
export type QrDecodedContentType =
  | 'url'
  | 'email'
  | 'phone'
  | 'sms'
  | 'wifi'
  | 'vcard'
  | 'geo'
  | 'calendar'
  | 'json'
  | 'text'
  | 'unknown'

export type DecodeStatus = 'idle' | 'loading' | 'success' | 'failed'

export interface DecodeResult {
  id: string
  fileName: string
  fileSize: number
  imageUrl: string
  content: string
  contentType: QrDecodedContentType
  status: DecodeStatus
  errorMessage?: string
  createdAt: number
}

export interface QrDecodeHistoryItem {
  id: string
  content: string
  contentType: QrDecodedContentType
  fileName?: string
  createdAt: number
}
```

---

## 十、二维码解码工具函数

新增文件：

```txt
src/utils/qrDecode.ts
```

实现二维码图片识别：

```ts
import jsQR from 'jsqr'

export async function decodeQrFromFile(file: File): Promise<string | null> {
  const image = await createImageBitmap(file)

  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  ctx.drawImage(image, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(imageData.data, canvas.width, canvas.height)

  return result?.data || null
}
```

---

## 十一、识别失败自动增强重试

新增文件：

```txt
src/utils/qrImageEnhance.ts
```

要求：

当原图识别失败后，自动进行一次增强识别。

增强策略：

1. 图片放大 2 倍
2. 灰度化
3. 提升对比度
4. 二值化
5. 再次调用 jsQR 识别

实现参考：

```ts
import { decodeQrFromFile } from './qrDecode'

export async function decodeWithFallback(file: File): Promise<string | null> {
  const firstResult = await decodeQrFromFile(file)

  if (firstResult) {
    return firstResult
  }

  const enhancedFile = await enhanceQrImage(file)
  return decodeQrFromFile(enhancedFile)
}

export async function enhanceQrImage(file: File): Promise<File> {
  const image = await createImageBitmap(file)

  const canvas = document.createElement('canvas')
  canvas.width = image.width * 2
  canvas.height = image.height * 2

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return file
  }

  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    const contrast = gray > 128 ? 255 : 0

    data[i] = contrast
    data[i + 1] = contrast
    data[i + 2] = contrast
  }

  ctx.putImageData(imageData, 0, 0)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(file)
        return
      }

      resolve(new File([blob], file.name, { type: file.type }))
    }, file.type)
  })
}
```

---

## 十二、内容类型识别

新增文件：

```txt
src/utils/qrContentDetect.ts
```

实现：

```ts
import type { QrDecodedContentType } from '@/types/qr'

export function detectQrContentType(content: string): QrDecodedContentType {
  const value = content.trim()

  if (/^https?:\/\//i.test(value)) return 'url'
  if (/^mailto:/i.test(value)) return 'email'
  if (/^tel:/i.test(value)) return 'phone'
  if (/^sms:/i.test(value)) return 'sms'
  if (/^WIFI:/i.test(value)) return 'wifi'
  if (/BEGIN:VCARD/i.test(value)) return 'vcard'
  if (/^geo:/i.test(value)) return 'geo'
  if (/BEGIN:VEVENT/i.test(value)) return 'calendar'

  try {
    JSON.parse(value)
    return 'json'
  } catch {
    return 'text'
  }
}
```

---

## 十三、内容解析工具

新增文件：

```txt
src/utils/qrContentParser.ts
```

### 13.1 解析 Wi-Fi 二维码

```ts
export interface ParsedWifi {
  encryption?: string
  ssid?: string
  password?: string
  hidden?: boolean
}

export function parseWifiContent(content: string): ParsedWifi {
  const result: ParsedWifi = {}

  const value = content.replace(/^WIFI:/i, '').replace(/;;$/, '')
  const parts = value.split(';')

  parts.forEach((part) => {
    const [key, ...rest] = part.split(':')
    const currentValue = rest.join(':')

    if (key === 'T') result.encryption = currentValue
    if (key === 'S') result.ssid = currentValue
    if (key === 'P') result.password = currentValue
    if (key === 'H') result.hidden = currentValue === 'true'
  })

  return result
}
```

### 13.2 解析 vCard

```ts
export interface ParsedVCard {
  name?: string
  phone?: string
  email?: string
  company?: string
  title?: string
  url?: string
  address?: string
  note?: string
}

export function parseVCardContent(content: string): ParsedVCard {
  const result: ParsedVCard = {}
  const lines = content.split(/\r?\n/)

  lines.forEach((line) => {
    const [key, ...rest] = line.split(':')
    const value = rest.join(':')

    if (key === 'FN') result.name = value
    if (key === 'TEL') result.phone = value
    if (key === 'EMAIL') result.email = value
    if (key === 'ORG') result.company = value
    if (key === 'TITLE') result.title = value
    if (key === 'URL') result.url = value
    if (key === 'ADR') result.address = value
    if (key === 'NOTE') result.note = value
  })

  return result
}
```

### 13.3 URL 风险提示

```ts
export function getUrlRiskTips(url: string): string[] {
  const tips: string[] = []

  if (!url.startsWith('https://')) {
    tips.push('该链接不是 HTTPS，请谨慎打开')
  }

  if (url.length > 120) {
    tips.push('该链接较长，请确认来源可信')
  }

  if (/[^\x00-\x7F]/.test(url)) {
    tips.push('该链接包含特殊字符，请注意仿冒风险')
  }

  return tips
}
```

---

## 十四、识别结果展示要求

识别成功后，根据内容类型展示不同结果。

---

### 14.1 URL 链接

识别示例：

```txt
https://example.com
```

展示内容：

```txt
类型：链接
内容：https://example.com
```

操作按钮：

```txt
打开链接
复制链接
重新生成二维码
```

安全提示：

```txt
请确认二维码来源可信后再打开链接。
```

如果不是 HTTPS，额外提示：

```txt
该链接不是 HTTPS，请谨慎打开。
```

---

### 14.2 邮箱

识别示例：

```txt
mailto:test@example.com?subject=hello
```

展示内容：

```txt
类型：邮箱
邮箱：test@example.com
```

操作按钮：

```txt
发送邮件
复制邮箱
复制完整内容
重新生成二维码
```

---

### 14.3 电话

识别示例：

```txt
tel:13800138000
```

展示内容：

```txt
类型：电话
号码：13800138000
```

操作按钮：

```txt
复制号码
拨打电话
重新生成二维码
```

---

### 14.4 短信

识别示例：

```txt
sms:13800138000?body=hello
```

展示内容：

```txt
类型：短信
手机号：13800138000
短信内容：hello
```

操作按钮：

```txt
复制手机号
复制短信内容
复制完整内容
重新生成二维码
```

---

### 14.5 Wi-Fi

识别示例：

```txt
WIFI:T:WPA;S:MyWifi;P:12345678;H:false;;
```

展示内容：

```txt
类型：Wi-Fi
Wi-Fi 名称：MyWifi
加密方式：WPA
密码：******
隐藏网络：否
```

操作按钮：

```txt
显示 / 隐藏密码
复制 Wi-Fi 名称
复制密码
复制完整配置
重新生成二维码
```

---

### 14.6 vCard 名片

识别示例：

```txt
BEGIN:VCARD
VERSION:3.0
FN:张三
TEL:13800138000
EMAIL:test@example.com
END:VCARD
```

展示内容：

```txt
类型：名片
姓名：张三
电话：13800138000
邮箱：test@example.com
公司：xxx
职位：xxx
```

操作按钮：

```txt
复制联系人信息
下载 vCard
重新生成二维码
```

---

### 14.7 JSON

如果识别结果是 JSON，格式化展示。

操作按钮：

```txt
格式化 JSON
复制 JSON
压缩 JSON
重新生成二维码
```

---

### 14.8 普通文本

展示内容：

```txt
类型：文本
内容：xxx
```

操作按钮：

```txt
复制文本
重新生成二维码
```

---

## 十五、识别失败处理

识别失败时，展示明确提示，不要只显示错误。

失败文案：

```txt
未识别到二维码，请尝试上传更清晰的图片，或裁剪二维码区域后重新上传。
```

展示可能原因：

```txt
可能原因：
1. 图片过于模糊
2. 二维码太小
3. 二维码被遮挡
4. 背景过于复杂
5. 颜色对比度过低
6. 二维码区域不完整
```

操作按钮：

```txt
重新上传
增强后重试
裁剪后识别
```

第一版中「裁剪后识别」如果还没有联动图片裁剪工具，可以先隐藏或置灰。

---

## 十六、复制功能要求

需要封装统一复制方法。

支持复制：

1. 完整识别内容
2. URL
3. 邮箱
4. 电话
5. Wi-Fi 名称
6. Wi-Fi 密码
7. vCard 联系人信息
8. JSON 内容
9. 普通文本

复制成功提示：

```txt
已复制到剪贴板
```

复制失败提示：

```txt
复制失败，请手动复制
```

---

## 十七、最近识别历史

使用 `chrome.storage.local` 或 localStorage 保存最近成功识别记录。

如果项目是 Chrome 插件环境，优先使用：

```ts
chrome.storage.local
```

需要权限：

```json
{
  "permissions": ["storage"]
}
```

历史记录要求：

1. 最多保存 30 条
2. 只保存识别内容
3. 保存内容类型
4. 保存文件名
5. 保存识别时间
6. 不保存用户上传的原始图片
7. 支持删除单条记录
8. 支持清空全部记录
9. 点击历史记录可以复制
10. 点击历史记录可以重新生成二维码

历史记录结构：

```ts
export interface QrDecodeHistoryItem {
  id: string
  content: string
  contentType: QrDecodedContentType
  fileName?: string
  createdAt: number
}
```

---

## 十八、重新生成二维码联动

识别结果区域增加按钮：

```txt
重新生成二维码
```

点击后执行：

1. 切换到「生成二维码」Tab
2. 将识别内容填入生成二维码的内容输入框
3. 自动判断内容类型
4. 触发二维码预览生成

示例：

```ts
function regenerateQrCode(content: string) {
  activeTab.value = 'generate'
  generatorContent.value = content
}
```

请根据项目现有状态管理方式实现。

---

## 十九、组件职责

### 19.1 QrDecoder.vue

职责：

1. 解码页面主组件
2. 管理解码状态
3. 管理解码结果
4. 管理历史记录
5. 处理上传、拖拽、粘贴事件
6. 与二维码生成 Tab 联动

---

### 19.2 QrDecodeUpload.vue

职责：

1. 图片上传
2. 拖拽上传
3. 粘贴识别提示
4. 图片预览
5. 上传状态展示
6. 失败状态展示

---

### 19.3 QrDecodeResult.vue

职责：

1. 展示识别结果
2. 根据类型结构化展示
3. 提供复制按钮
4. 提供打开链接按钮
5. 提供 Wi-Fi 密码显示 / 隐藏
6. 提供 vCard 下载
7. 提供重新生成二维码按钮

---

### 19.4 QrDecodeHistory.vue

职责：

1. 展示最近识别记录
2. 复制历史内容
3. 删除单条历史
4. 清空历史
5. 点击历史重新生成二维码

---

## 二十、推荐页面文案

页面标题：

```txt
识别二维码
```

页面描述：

```txt
上传、拖拽或粘贴二维码图片，快速解析二维码内容。
```

上传区：

```txt
拖拽二维码图片到这里，或点击上传
支持 PNG、JPG、JPEG、WEBP，也可以直接 Ctrl + V 粘贴截图
```

识别中：

```txt
正在识别二维码...
```

识别成功：

```txt
识别成功
```

识别失败：

```txt
未识别到二维码，请尝试上传更清晰的图片，或裁剪二维码区域后重新上传。
```

按钮文案：

```txt
上传图片
重新上传
复制内容
打开链接
重新生成二维码
增强后重试
清空结果
删除记录
清空历史
显示密码
隐藏密码
复制密码
```

---

## 二十一、第一版实现范围

本次必须实现：

```txt
1. 单张图片上传识别
2. 拖拽上传识别
3. Ctrl + V 粘贴截图识别
4. 图片预览
5. 识别 loading 状态
6. 识别成功状态
7. 识别失败状态
8. 识别失败后自动增强重试
9. 内容类型自动判断
10. URL / Wi-Fi / vCard / JSON / 文本展示
11. 复制识别内容
12. URL 打开按钮
13. Wi-Fi 密码显示 / 隐藏和复制
14. vCard 信息展示和复制
15. 最近识别历史
16. 删除历史
17. 清空历史
18. 重新生成二维码联动
19. 响应式布局
20. 与现有工具 UI 风格统一
```

本次不需要实现：

```txt
1. 摄像头实时扫码
2. 批量解码
3. 当前网页图片右键识别
4. 截图区域识别
5. CSV 导出
6. 云端安全检测
```

---

## 二十二、第二版预留功能

请在代码结构上尽量方便后续扩展以下能力：

```txt
1. 批量解码
2. 批量结果导出 CSV
3. 当前网页图片右键识别
4. 截图区域识别
5. 摄像头实时扫码
6. URL 域名风险提示
7. 与 JSON 工具联动
8. 与图片裁剪工具联动
9. 与二维码生成工具双向联动
```

---

## 二十三、开发注意事项

1. 不要保存用户上传的原始图片到历史记录中。
2. 上传图片预览使用 `URL.createObjectURL` 后，需要在组件卸载或更换图片时释放。
3. 粘贴事件监听需要在组件卸载时移除。
4. URL 打开前需要提示用户确认来源可信。
5. 图片文件需要校验格式和大小。
6. 识别失败不能直接抛异常，需要展示友好提示。
7. 解码逻辑必须封装为工具函数，不要全部写在组件里。
8. 内容类型识别和内容解析需要分开，方便后续扩展。
9. 如果浏览器不支持 `createImageBitmap`，需要提供降级方案。
10. 第一版优先保证识别稳定性、交互流畅和 UI 统一。

---

## 二十四、验收标准

### 基础识别

* 上传二维码图片后可以识别内容
* 拖拽二维码图片后可以识别内容
* Ctrl + V 粘贴截图后可以识别内容
* 识别过程中有 loading 状态
* 识别成功后展示内容
* 识别失败后展示友好提示

### 智能分类

* URL 可以识别为链接
* 邮箱可以识别为邮箱
* 电话可以识别为电话
* 短信可以识别为短信
* Wi-Fi 可以解析 SSID、密码、加密方式
* vCard 可以解析姓名、电话、邮箱
* JSON 可以格式化展示
* 普通文本可以正常展示

### 操作能力

* 可以复制完整识别结果
* URL 可以打开链接
* Wi-Fi 密码可以显示 / 隐藏
* Wi-Fi 密码可以单独复制
* vCard 联系人信息可以复制
* 可以点击重新生成二维码

### 失败处理

* 原图识别失败后可以自动增强重试
* 失败提示清晰
* 提供重新上传入口
* 页面不会崩溃或卡死

### 历史记录

* 成功识别后进入历史记录
* 历史记录最多保存 30 条
* 历史记录可以复制
* 历史记录可以删除
* 可以清空全部历史
* 不保存用户上传的原始图片

### UI 效果

* 页面风格与现有工具统一
* 页面布局简洁清晰
* 卡片、按钮、上传区风格接近 Ant Design Pro
* 窄屏下布局不崩坏
* 操作反馈明确
