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
import {
  BASE_CURRENCY,
  formatMoney,
  formatMoneyCompact,
  type Currency,
} from "./currency";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Money helpers. Amounts are always *stored* in QAR (see lib/currency.ts);
 * `currency` only picks how they are displayed, and defaults to QAR so call
 * sites that have no currency in scope keep their previous behaviour.
 */

/** Formats a QAR amount in the display currency, e.g. formatCurrency(1234.5) -> "QAR 1,234.50" */
export function formatCurrency(amount: number, currency: Currency = BASE_CURRENCY): string {
  if (!Number.isFinite(amount)) return formatMoney(0, currency);
  return formatMoney(amount, currency);
}

/** Compact currency for tight spaces like chart axes, e.g. "QAR 12.3k" */
export function formatCurrencyCompact(amount: number, currency: Currency = BASE_CURRENCY): string {
  if (!Number.isFinite(amount)) return formatMoneyCompact(0, currency);
  return formatMoneyCompact(amount, currency);
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}

/** Formats an ISO date, or "Unknown" for sales imported without a recorded date. */
export function formatDate(dateStr: string | null, pattern = "MMM d, yyyy"): string {
  if (!dateStr) return "Unknown";
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
