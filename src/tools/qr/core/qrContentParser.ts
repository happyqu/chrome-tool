export interface ParsedWifi {
  encryption?: string;
  ssid?: string;
  password?: string;
  hidden?: boolean;
}

export interface ParsedVCard {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  url?: string;
  address?: string;
  note?: string;
}

export function parseWifiContent(content: string): ParsedWifi {
  const result: ParsedWifi = {};
  const value = content.replace(/^WIFI:/i, "").replace(/;;$/, "");
  const parts = value.split(/(?<!\\);/);

  parts.forEach(part => {
    const [key, ...rest] = part.split(":");
    const currentValue = rest.join(":").replace(/\\([;,:\\"])/g, "$1");

    if (key === "T") result.encryption = currentValue;
    if (key === "S") result.ssid = currentValue;
    if (key === "P") result.password = currentValue;
    if (key === "H") result.hidden = currentValue.toLowerCase() === "true";
  });

  return result;
}

export function parseVCardContent(content: string): ParsedVCard {
  const result: ParsedVCard = {};
  const lines = content.split(/\r?\n/);

  lines.forEach(line => {
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.split(";")[0].toUpperCase();
    const value = rest.join(":").trim();

    if (key === "FN") result.name = value;
    if (key === "TEL" && !result.phone) result.phone = value;
    if (key === "EMAIL" && !result.email) result.email = value;
    if (key === "ORG") result.company = value;
    if (key === "TITLE") result.title = value;
    if (key === "URL") result.url = value;
    if (key === "ADR") result.address = value.replace(/;/g, " ").trim();
    if (key === "NOTE") result.note = value;
  });

  return result;
}

export function getUrlRiskTips(url: string): string[] {
  const tips: string[] = ["请确认二维码来源可信后再打开链接。"];

  if (!url.startsWith("https://")) {
    tips.push("该链接不是 HTTPS，请谨慎打开。");
  }

  if (url.length > 120) {
    tips.push("该链接较长，请确认来源可信。");
  }

  if (/[^\x00-\x7F]/.test(url)) {
    tips.push("该链接包含特殊字符，请注意仿冒风险。");
  }

  return tips;
}

export function parseEmailContent(content: string) {
  const url = new URL(content);
  return {
    email: url.pathname,
    subject: url.searchParams.get("subject") || "",
    body: url.searchParams.get("body") || ""
  };
}

export function parsePhoneContent(content: string) {
  return content.replace(/^tel:/i, "");
}

export function parseSmsContent(content: string) {
  const value = content.replace(/^sms:/i, "");
  const [phone, query = ""] = value.split("?");
  return {
    phone,
    body: new URLSearchParams(query).get("body") || ""
  };
}

