import type { QrDecodedContentType } from "../types";

export function detectQrContentType(content: string): QrDecodedContentType {
  const value = content.trim();

  if (/^https?:\/\//i.test(value)) return "url";
  if (/^mailto:/i.test(value)) return "email";
  if (/^tel:/i.test(value)) return "phone";
  if (/^sms:/i.test(value)) return "sms";
  if (/^WIFI:/i.test(value)) return "wifi";
  if (/BEGIN:VCARD/i.test(value)) return "vcard";
  if (/^geo:/i.test(value)) return "geo";
  if (/BEGIN:VEVENT/i.test(value)) return "calendar";

  try {
    JSON.parse(value);
    return "json";
  } catch {
    return value ? "text" : "unknown";
  }
}

