import type { FixedSliceOptions, GridOptions, SliceRect, WhitespaceSliceOptions } from "../types";

function makeId(): string {
  return crypto.randomUUID();
}

function createSlice(index: number, x: number, y: number, width: number, height: number, name?: string): SliceRect {
  return {
    id: makeId(),
    name: name ?? `slice-${String(index + 1).padStart(3, "0")}`,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    selected: false
  };
}

export function sliceByGrid(
  imageWidth: number,
  imageHeight: number,
  options: GridOptions
): SliceRect[] {
  const rows = Math.max(1, Math.floor(options.rows));
  const cols = Math.max(1, Math.floor(options.cols));
  const padding = Math.max(0, options.padding);
  const gapX = Math.max(0, options.gapX);
  const gapY = Math.max(0, options.gapY);
  const availableWidth = imageWidth - padding * 2 - gapX * (cols - 1);
  const availableHeight = imageHeight - padding * 2 - gapY * (rows - 1);

  if (availableWidth <= 0 || availableHeight <= 0) {
    return [];
  }

  const cellWidth = Math.floor(availableWidth / cols);
  const cellHeight = Math.floor(availableHeight / rows);
  const rects: SliceRect[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      rects.push(
        createSlice(
          rects.length,
          padding + col * (cellWidth + gapX),
          padding + row * (cellHeight + gapY),
          cellWidth,
          cellHeight,
          `slice-${row + 1}-${col + 1}`
        )
      );
    }
  }

  return rects;
}

export function sliceByFixedSize(
  imageWidth: number,
  imageHeight: number,
  options: FixedSliceOptions
): SliceRect[] {
  const sliceWidth = Math.max(1, Math.floor(options.sliceWidth));
  const sliceHeight = Math.max(1, Math.floor(options.sliceHeight));
  const startX = Math.max(0, Math.floor(options.startX));
  const startY = Math.max(0, Math.floor(options.startY));
  const rects: SliceRect[] = [];

  for (let y = startY; y < imageHeight; y += sliceHeight) {
    for (let x = startX; x < imageWidth; x += sliceWidth) {
      const width = Math.min(sliceWidth, imageWidth - x);
      const height = Math.min(sliceHeight, imageHeight - y);
      if (options.trimIncomplete && (width < sliceWidth || height < sliceHeight)) {
        continue;
      }
      rects.push(createSlice(rects.length, x, y, width, height));
    }
  }

  return rects;
}

function isEmptyPixel(data: Uint8ClampedArray, index: number, threshold: number): boolean {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const alpha = data[index + 3];
  const nearWhite = red >= 255 - threshold && green >= 255 - threshold && blue >= 255 - threshold;
  return alpha <= threshold || nearWhite;
}

function scanEmptyRows(imageData: ImageData, threshold: number): boolean[] {
  const rows: boolean[] = [];
  for (let y = 0; y < imageData.height; y += 1) {
    let empty = true;
    for (let x = 0; x < imageData.width; x += 1) {
      const index = (y * imageData.width + x) * 4;
      if (!isEmptyPixel(imageData.data, index, threshold)) {
        empty = false;
        break;
      }
    }
    rows.push(empty);
  }
  return rows;
}

function scanEmptyCols(imageData: ImageData, threshold: number): boolean[] {
  const cols: boolean[] = [];
  for (let x = 0; x < imageData.width; x += 1) {
    let empty = true;
    for (let y = 0; y < imageData.height; y += 1) {
      const index = (y * imageData.width + x) * 4;
      if (!isEmptyPixel(imageData.data, index, threshold)) {
        empty = false;
        break;
      }
    }
    cols.push(empty);
  }
  return cols;
}

function splitByEmptyLines(emptyLines: boolean[], max: number): Array<{ start: number; end: number }> {
  const segments: Array<{ start: number; end: number }> = [];
  let start: number | null = null;

  for (let i = 0; i < max; i += 1) {
    if (!emptyLines[i] && start === null) {
      start = i;
    }
    if ((emptyLines[i] || i === max - 1) && start !== null) {
      const end = emptyLines[i] ? i : i + 1;
      if (end > start) {
        segments.push({ start, end });
      }
      start = null;
    }
  }

  return segments;
}

function mergeNearbyRects(rects: SliceRect[], mergeGap: number): SliceRect[] {
  if (mergeGap <= 0) {
    return rects;
  }

  const merged: SliceRect[] = [];
  for (const rect of rects) {
    const existing = merged.find(item => {
      const horizontalGap = Math.max(item.x, rect.x) - Math.min(item.x + item.width, rect.x + rect.width);
      const verticalGap = Math.max(item.y, rect.y) - Math.min(item.y + item.height, rect.y + rect.height);
      return horizontalGap <= mergeGap && verticalGap <= mergeGap;
    });

    if (!existing) {
      merged.push({ ...rect });
      continue;
    }

    const minX = Math.min(existing.x, rect.x);
    const minY = Math.min(existing.y, rect.y);
    const maxX = Math.max(existing.x + existing.width, rect.x + rect.width);
    const maxY = Math.max(existing.y + existing.height, rect.y + rect.height);
    existing.x = minX;
    existing.y = minY;
    existing.width = maxX - minX;
    existing.height = maxY - minY;
  }

  return merged.map((rect, index) => ({ ...rect, name: `slice-${String(index + 1).padStart(3, "0")}` }));
}

export function autoSliceByWhitespace(
  imageData: ImageData,
  options: WhitespaceSliceOptions
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
        rects.push(createSlice(rects.length, col.start, row.start, width, height));
      }
    }
  }

  return mergeNearbyRects(rects, options.mergeGap);
}
