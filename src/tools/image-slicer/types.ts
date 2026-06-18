export type ImageOutputFormat = "png" | "jpg" | "jpeg" | "webp" | "avif";

export type ToolMode = "select" | "draw";

export type GuideLine = {
  id: string;
  axis: "x" | "y";
  position: number;
};

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

export type ImageState = {
  fileName: string;
  width: number;
  height: number;
  imageElement: HTMLImageElement;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type ExportOptions = {
  format: ImageOutputFormat;
  quality: number;
  scale: number;
  includeManifest: boolean;
  includeReadme: boolean;
  includeCodeSnippets: boolean;
  zipName: string;
  fileNameTemplate: string;
  prefix: string;
};

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

export type GridOptions = {
  rows: number;
  cols: number;
  gapX: number;
  gapY: number;
  padding: number;
};

export type FixedSliceOptions = {
  sliceWidth: number;
  sliceHeight: number;
  startX: number;
  startY: number;
  trimIncomplete: boolean;
};

export type DrawOptions = {
  fixedSizeEnabled: boolean;
  fixedWidth: number;
  fixedHeight: number;
};

export type WhitespaceSliceOptions = {
  threshold: number;
  minWidth: number;
  minHeight: number;
  mergeGap: number;
};
