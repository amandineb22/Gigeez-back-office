import clsx, { type ClassValue } from "clsx";
import {
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subYears,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a number as USD, e.g. formatCurrency(1234.5) -> "$1,234.50" */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "$0.00";
  return currencyFormatter.format(amount);
}

/** Compact currency for tight spaces like chart axes, e.g. "$12.3k" */
export function formatCurrencyCompact(amount: number): string {
  if (!Number.isFinite(amount)) return "$0";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toFixed(0)}`;
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

export function formatDate(dateStr: string, pattern = "MMM d, yyyy"): string {
  try {
    return format(parseISO(dateStr), pattern);
  } catch {
    return dateStr;
  }
}

export interface DateRange {
  from: string; // ISO date, yyyy-MM-dd
  to: string; // ISO date, yyyy-MM-dd
}

const ISO_DATE = "yyyy-MM-dd";

/** Default global date range: the current calendar month to date. */
export function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    from: format(startOfMonth(now), ISO_DATE),
    to: format(now, ISO_DATE),
  };
}

/** Reads ?from=&to= search params, falling back to the default range if absent/invalid. */
export function parseDateRangeParams(
  searchParams: Record<string, string | string[] | undefined>
): DateRange {
  const from = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const to = typeof searchParams.to === "string" ? searchParams.to : undefined;
  if (from && to && !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to))) {
    return { from, to };
  }
  return getDefaultDateRange();
}

/** The immediately preceding period of the same length — used for period-over-period comparisons. */
export function getPreviousPeriod({ from, to }: DateRange): DateRange {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  const lengthDays = differenceInCalendarDays(toDate, fromDate) + 1;
  return {
    from: format(subDays(fromDate, lengthDays), ISO_DATE),
    to: format(subDays(fromDate, 1), ISO_DATE),
  };
}

/** Same date range, one year earlier — used for YoY comparisons. */
export function getYoYPeriod({ from, to }: DateRange): DateRange {
  return {
    from: format(subYears(parseISO(from), 1), ISO_DATE),
    to: format(subYears(parseISO(to), 1), ISO_DATE),
  };
}

export function currentMonthRange(): DateRange {
  const now = new Date();
  return {
    from: format(startOfMonth(now), ISO_DATE),
    to: format(endOfMonth(now), ISO_DATE),
  };
}

export function isWithinRange(dateStr: string, range: DateRange): boolean {
  return dateStr >= range.from && dateStr <= range.to;
}

/** Percent change from `previous` to `current`, guarding against divide-by-zero. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function toTitleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
