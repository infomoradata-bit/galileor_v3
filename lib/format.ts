import type { Currency } from "./types";

const LOCALE: Record<Currency, string> = { CHF: "de-CH", EUR: "de-DE" };

export function fmtMoney(value: number, currency: Currency, decimals = 0): string {
  const n = value.toLocaleString(LOCALE[currency], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency} ${n}`;
}

export function fmtNumber(value: number, currency: Currency = "CHF", decimals = 0): string {
  return value.toLocaleString(LOCALE[currency], {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(value: number, decimals = 1): string {
  return `${value.toLocaleString("de-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;
}

export function fmtSigned(value: number, currency: Currency, decimals = 0): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${fmtMoney(value, currency, decimals)}`;
}

export function fmtYears(value: number | null, decimals = 1): string {
  if (value === null) return "—";
  return `${value.toLocaleString("de-CH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} years`;
}

/** Compact axis labels like 1.2M / 350K */
export function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${Math.round(value)}`;
}
