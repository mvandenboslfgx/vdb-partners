export function maskIban(value: string) {
  const iban = value.replace(/\s/g, "");
  return iban.length < 8 ? "****" : `${iban.slice(0, 4)}${"•".repeat(iban.length - 8)}${iban.slice(-4)}`;
}
export function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}${"•".repeat(Math.max(2, local.length - 1))}@${domain}`;
}
export function maskSensitive<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) =>
    /iban|bank|account|email|phone|address|birth/i.test(key) ? [key, typeof item === "string" ? "•••" : "[REDACTED]"] : [key, maskSensitive(item)],
  )) as T;
}
