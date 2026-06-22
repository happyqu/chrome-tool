export function isValidIpv4(value: string): boolean {
  const parts = value.trim().split(".");
  if (parts.length !== 4) return false;

  return parts.every(part => {
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part.startsWith("0")) return false;
    const number = Number(part);
    return number >= 0 && number <= 255;
  });
}

export function isValidIpv6(value: string): boolean {
  const address = value.trim();
  if (!address || !/^[0-9a-fA-F:]+$/.test(address)) return false;
  if (!address.includes(":")) return false;

  const compressed = address.includes("::");
  if ((address.match(/::/g) || []).length > 1) return false;

  const parts = address.split(":").filter(Boolean);
  if (parts.length > 8) return false;
  if (!compressed && parts.length !== 8) return false;

  return parts.every(part => part.length <= 4 && /^[0-9a-fA-F]{1,4}$/.test(part));
}

export function isValidIp(value: string): boolean {
  const ip = value.trim();
  return isValidIpv4(ip) || isValidIpv6(ip);
}
