"use client";

import { useSearchParams } from "next/navigation";
import { parseCurrencyParam, type Currency } from "./currency";

/**
 * The display currency for client components (charts, tables), read straight
 * off ?currency= so they stay in sync with the server components around them
 * without the currency being threaded down as a prop.
 *
 * Components using this need a <Suspense> boundary above them, the same as any
 * other useSearchParams() caller in the app.
 */
export function useCurrency(): Currency {
  return parseCurrencyParam(useSearchParams());
}
