import type { CompressionMode } from "../types";

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
} as const satisfies Record<
  CompressionMode,
  {
    label: string;
    description: string;
    pngColors: number;
    pngQualityMin: number;
    pngQualityMax: number;
    jpegQuality: number;
    webpQuality: number;
    oxipngLevel: number;
  }
>;

export const ssimThresholds = {
  high: 0.985,
  balanced: 0.97,
  small: 0.94,
  extreme: 0.9
} as const satisfies Record<CompressionMode, number>;
