export type IpLookupMode = "token" | "legacy";

export type IpQueryType = "self" | "manual";

export interface IpLookupResult {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  location?: string;
  timezone?: string;
  postal?: string;
  asn?: string;
  organization?: string;
  domain?: string;
  continent?: string;
  continentCode?: string;
  hostname?: string;
  source: IpLookupMode;
  raw: unknown;
}

export interface IpLookupHistoryItem extends IpLookupResult {
  id: string;
  queryType: IpQueryType;
  queriedAt: number;
}

export interface StoredIpLookupState {
  token?: string;
  history?: IpLookupHistoryItem[];
}
