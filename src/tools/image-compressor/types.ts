export type CompressionMode = "high" | "balanced" | "small" | "extreme";

export type CompressStatus = "pending" | "compressing" | "success" | "failed" | "skipped";

export type SupportedImageMimeType = "image/png" | "image/jpeg" | "image/webp";

export interface CompressFileItem {
  id: string;
  file: File;
  fileName: string;
  mimeType: SupportedImageMimeType;
  originalSize: number;
  width?: number;
  height?: number;
  targetWidth?: number;
  targetHeight?: number;
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
  width?: number;
  height?: number;
  qualityScore?: number;
}

export interface CompressCandidate {
  buffer: ArrayBuffer;
  mimeType: string;
  extension: string;
  strategy: string;
  qualityScore?: number;
}

export interface CompressWorkerRequest {
  id: string;
  fileName: string;
  mimeType: string;
  buffer: ArrayBuffer;
  mode: CompressionMode;
  allowConvertToWebp: boolean;
  allowKeepOriginal: boolean;
  targetWidth?: number;
  targetHeight?: number;
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

export type CompressWorkerResponse = CompressWorkerSuccessResponse | CompressWorkerErrorResponse;
