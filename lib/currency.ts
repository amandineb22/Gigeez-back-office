/**
 * Display currency for the whole back office.
 *
 * Everything is *stored* in QAR — product costs, sale prices, expenses and the
 * imported financials all come from sheets denominated in Qatari Riyal. The
 * currency picker in the top bar only changes how those stored QAR figures are
 * rendered; it never changes what is written to the database.
 *
 * The choice travels on the URL as ?currency=, the same way the date range
 * travels as ?from=&to=, so server components can read it from `searchParams`
 * and client components from `useSearchParams()` without any shared state.
 */

export const CURRENCIES = ["QAR", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const BASE_CURRENCY: Currency = "QAR";

/**
 * How many QAR one unit of each currency is worth.
 *
 * These are fixed rates, not a live feed: the riyal is pegged to the dollar at
 * 3.64, and 4.1245 is the EUR rate the Gigeez P&L sheet itself uses (cell A1),
 * so converted figures tie back to the spreadsheet exactly. Edit them here when
 * the planning rate changes — nothing else reads a rate.
 */
export const QAR_PER_UNIT: Record<Currency, number> = {
  QAR: 1,
  EUR: 4.1245,
  USD: 3.64,
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  QAR: "QAR",
  EUR: "EUR",
  USD: "USD",
};

/** Converts an amount held in QAR into the requested display currency. */
export function convertFromBase(amountInQar: number, currency: Currency): number {
  if (!Number.isFinite(amountInQar)) return 0;
  return amountInQar / QAR_PER_UNIT[currency];
}

/** Converts an amount in `currency` back into QAR, for storing user input. */
export function convertToBase(amount: number, currency: Currency): number {
  if (!Number.isFinite(amount)) return 0;
  return amount * QAR_PER_UNIT[currency];
}

function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value.toUpperCase());
}

/**
 * Reads ?currency= off a page's search params, falling back to QAR for a
 * missing or unrecognised value.
 */
export function parseCurrencyParam(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams
): Currency {
  // Duck-typed rather than `instanceof URLSearchParams`: client components pass
  // Next's ReadonlyURLSearchParams, which need not be a real subclass.
  const raw =
    typeof (searchParams as URLSearchParams).get === "function"
      ? (searchParams as URLSearchParams).get("currency")
      : (searchParams as Record<string, string | string[] | undefined>).currency;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isCurrency(value) ? (value.toUpperCase() as Currency) : BASE_CURRENCY;
}

const formatters = new Map<Currency, Intl.NumberFormat>();

function formatterFor(currency: Currency): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * Formats an amount held in QAR in the given display currency,
 * e.g. formatMoney(1234.5, "EUR") -> "€299.31".
 */
export function formatMoney(amountInQar: number, currency: Currency = BASE_CURRENCY): string {
  return formatterFor(currency).format(convertFromBase(amountInQar, currency));
}

/** Compact form for tight spaces like chart axes, e.g. "EUR 12.3k". */
export function formatMoneyCompact(amountInQar: number, currency: Currency = BASE_CURRENCY): string {
  const value = convertFromBase(amountInQar, currency);
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${currency} ${(value / 1_000).toFixed(1)}k`;
  return `${currency} ${value.toFixed(0)}`;
}
