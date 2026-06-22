export type QrDecodedContentType =
  | "url"
  | "email"
  | "phone"
  | "sms"
  | "wifi"
  | "vcard"
  | "geo"
  | "calendar"
  | "json"
  | "text"
  | "unknown";

export type DecodeStatus = "idle" | "loading" | "success" | "failed";

export interface DecodeResult {
  id: string;
  fileName: string;
  fileSize: number;
  imageUrl: string;
  content: string;
  contentType: QrDecodedContentType;
  status: DecodeStatus;
  errorMessage?: string;
  createdAt: number;
}

export interface QrDecodeHistoryItem {
  id: string;
  content: string;
  contentType: QrDecodedContentType;
  fileName?: string;
  createdAt: number;
}

