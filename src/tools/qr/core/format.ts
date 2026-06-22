import type { QrDecodedContentType } from "../types";

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function typeLabel(type: QrDecodedContentType) {
  const labels: Record<QrDecodedContentType, string> = {
    url: "链接",
    email: "邮箱",
    phone: "电话",
    sms: "短信",
    wifi: "Wi-Fi",
    vcard: "名片",
    geo: "地理位置",
    calendar: "日历",
    json: "JSON",
    text: "文本",
    unknown: "未知"
  };

  return labels[type];
}

