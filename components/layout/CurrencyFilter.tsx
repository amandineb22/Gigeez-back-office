"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CURRENCIES, CURRENCY_LABELS, parseCurrencyParam } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * Global display-currency filter. Writes ?currency= on the URL next to the
 * date range, so every page re-renders its figures in the chosen currency.
 *
 * This is presentation only: the underlying records stay in QAR, and switching
 * currency never writes anything.
 */
export function CurrencyFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseCurrencyParam(searchParams);

  function select(currency: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", currency);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div
      className="flex items-center gap-0.5 rounded-full bg-paper p-0.5"
      role="group"
      aria-label="Display currency"
    >
      {CURRENCIES.map((c) => {
        const isActive = active === c;
        return (
          <button
            key={c}
            onClick={() => select(c)}
            aria-pressed={isActive}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-editorial",
              isActive ? "bg-brand-500 text-white" : "text-ink/50 hover:text-brand-700"
            )}
          >
            {CURRENCY_LABELS[c]}
          </button>
        );
      })}
    </div>
  );
}
