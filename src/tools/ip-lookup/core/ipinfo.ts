import type { IpLookupHistoryItem, IpLookupResult, StoredIpLookupState } from "../types";

const STORAGE_KEY = "ipLookup";
const HISTORY_LIMIT = 20;

interface LiteResponse {
  ip: string;
  asn?: string;
  as_name?: string;
  as_domain?: string;
  country_code?: string;
  country?: string;
  continent_code?: string;
  continent?: string;
}

interface LegacyResponse {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
}

function hasChromeStorage() {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function loadStoredState(): Promise<StoredIpLookupState> {
  if (hasChromeStorage()) {
    const value = await chrome.storage.local.get(STORAGE_KEY);
    return (value[STORAGE_KEY] || {}) as StoredIpLookupState;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as StoredIpLookupState) : {};
}

export async function saveStoredState(state: StoredIpLookupState): Promise<void> {
  if (hasChromeStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeLite(data: LiteResponse): IpLookupResult {
  return {
    ip: data.ip,
    asn: data.asn,
    organization: data.as_name,
    domain: data.as_domain,
    country: data.country,
    countryCode: data.country_code,
    continent: data.continent,
    continentCode: data.continent_code,
    source: "token",
    raw: data
  };
}

function normalizeLegacy(data: LegacyResponse): IpLookupResult {
  return {
    ip: data.ip,
    hostname: data.hostname,
    city: data.city,
    region: data.region,
    countryCode: data.country,
    location: data.loc,
    organization: data.org,
    postal: data.postal,
    timezone: data.timezone,
    source: "legacy",
    raw: data
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`请求失败：HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function lookupIp(ip: string | null, token: string): Promise<IpLookupResult> {
  const cleanToken = token.trim();
  const cleanIp = ip?.trim();

  if (cleanToken) {
    const target = cleanIp ? encodeURIComponent(cleanIp) : "me";
    const url = `https://api.ipinfo.io/lite/${target}?token=${encodeURIComponent(cleanToken)}`;
    return normalizeLite(await fetchJson<LiteResponse>(url));
  }

  const target = cleanIp ? `/${encodeURIComponent(cleanIp)}` : "";
  const url = `https://ipinfo.io${target}/json`;
  return normalizeLegacy(await fetchJson<LegacyResponse>(url));
}

export function addHistoryItem(
  history: IpLookupHistoryItem[],
  result: IpLookupResult,
  queryType: IpLookupHistoryItem["queryType"]
): IpLookupHistoryItem[] {
  const item: IpLookupHistoryItem = {
    ...result,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    queryType,
    queriedAt: Date.now()
  };

  return [item, ...history.filter(entry => entry.ip !== result.ip)].slice(0, HISTORY_LIMIT);
}
