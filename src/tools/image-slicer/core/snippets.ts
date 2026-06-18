import type { SliceManifestItem } from "../types";

function className(name: string): string {
  return `image-${name}`.replace(/[^a-zA-Z0-9_-]+/g, "-").toLowerCase();
}

export function generateCssSnippets(slices: SliceManifestItem[]): string {
  return slices
    .map(
      item => `.${className(item.name)} {
  width: ${item.width}px;
  height: ${item.height}px;
  background-image: url("../${item.file}");
  background-size: cover;
}`
    )
    .join("\n\n");
}

export function generateHtmlSnippets(slices: SliceManifestItem[]): string {
  const stackWidth = Math.max(...slices.map(item => item.width), 0);
  const images = slices
    .map(
      item =>
        `    <img src="../${item.file}" width="${item.width}" height="${item.height}" alt="${item.name}" />`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <style>
    html,
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      overflow-x: hidden;
    }

    .slice-stack {
      width: 100%;
      max-width: ${stackWidth || 1}px;
      margin: 0 auto;
      font-size: 0;
      line-height: 0;
    }

    .slice-stack img {
      display: block;
      width: 100%;
      height: auto;
      margin: 0;
      border: 0;
      vertical-align: top;
    }
  </style>
</head>
<body>
  <main class="slice-stack">
${images}
  </main>
</body>
</html>
`;
}

export function generateVue3Snippets(slices: SliceManifestItem[]): string {
  const stackWidth = Math.max(...slices.map(item => item.width), 0);
  const images = slices
    .map(
      item =>
        `    <img src="../${item.file}" width="${item.width}" height="${item.height}" alt="${item.name}" />`
    )
    .join("\n");

  return `<template>
  <div class="slice-stack">
${images}
  </div>
</template>

<style scoped>
.slice-stack {
  width: 100%;
  max-width: ${stackWidth || 1}px;
  margin: 0 auto;
  font-size: 0;
  line-height: 0;
}

.slice-stack img {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  border: 0;
  vertical-align: top;
}
</style>
`;
}

export function generateJsonSnippets(slices: SliceManifestItem[]): string {
  return JSON.stringify(
    slices.map(item => ({
      name: item.name,
      src: `./${item.file}`,
      width: item.width,
      height: item.height
    })),
    null,
    2
  );
}
