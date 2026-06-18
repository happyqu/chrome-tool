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
  return slices
    .map(
      item =>
        `<img src="./${item.file}" width="${item.width}" height="${item.height}" alt="${item.name}" />`
    )
    .join("\n");
}

export function generateVue3Snippets(slices: SliceManifestItem[]): string {
  const images = slices
    .map(
      item =>
        `    <img src="./${item.file}" width="${item.width}" height="${item.height}" alt="${item.name}" />`
    )
    .join("\n");

  return `<template>
  <div>
${images}
  </div>
</template>
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
