import { site } from "@/lib/site";

/** Formats whole Taka, e.g. 4290 -> "৳4,290". */
export function formatPrice(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `${site.currencySymbol}${safe.toLocaleString("en-US")}`;
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
