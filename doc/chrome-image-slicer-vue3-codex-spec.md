# Frontend Image Slicer Chrome Extension

一个面向前端开发者的 Chrome 图片切图工具，使用 Manifest V3、Vue 3、TypeScript 和 Vite 实现。

## 功能

- 本地上传、拖拽上传、剪贴板粘贴图片
- Canvas 图片预览
- 手动框选、移动、八方向缩放、删除、复制、重命名切片
- 网格分割
- 固定尺寸分割
- 基础空白区域自动分割
- 画布滚轮缩放、空格拖拽平移、双击重置视图
- 撤销、重做
- PNG、JPG/JPEG、WebP 导出
- ZIP 批量导出，包含 `slices/`、`manifest.json`、`snippets/` 和 `README.md`

## 开发

```bash
npm install
npm run dev
```

## 构建并加载扩展

```bash
npm run build
```

然后在 Chrome 中打开 `chrome://extensions`，启用开发者模式，选择 `dist` 目录加载已解压的扩展。
