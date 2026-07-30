"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns";
import { parseDateRangeParams } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ISO = "yyyy-MM-dd";

function presets() {
  const now = new Date();
  return [
    {
      key: "this-month",
      label: "This month",
      range: { from: format(startOfMonth(now), ISO), to: format(now, ISO) },
    },
    {
      key: "last-month",
      label: "Last month",
      range: (() => {
        const lastMonth = subMonths(now, 1);
        return { from: format(startOfMonth(lastMonth), ISO), to: format(endOfMonth(lastMonth), ISO) };
      })(),
    },
    {
      key: "this-quarter",
      label: "This quarter",
      range: { from: format(startOfQuarter(now), ISO), to: format(now, ISO) },
    },
    {
      key: "this-year",
      label: "This year",
      range: { from: format(startOfYear(now), ISO), to: format(now, ISO) },
    },
    {
      key: "last-30-days",
      label: "Last 30 days",
      range: { from: format(subDays(now, 29), ISO), to: format(now, ISO) },
    },
  ];
}

/**
 * Global date-range filter. Reads/writes ?from=&to= on the URL so every
 * dashboard page (each a server component reading `searchParams`) stays in
 * sync without any shared client state.
 *
 * A ?preset= key is also stored so the pill buttons reflect what was
 * actually clicked, rather than which range they compute to — several
 * presets (e.g. "This month" and "Last 30 days") can land on the exact same
 * dates depending on today's date, and comparing ranges would highlight all
 * of them at once.
 */
export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = parseDateRangeParams(Object.fromEntries(searchParams.entries()));
  const activePreset = searchParams.get("preset");

  function applyRange(from: string, to: string, presetKey: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", from);
    params.set("to", to);
    if (presetKey) {
      params.set("preset", presetKey);
    } else {
      params.delete("preset");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1">
        {presets().map((p) => {
          const active = activePreset === p.key;
          return (
            <button
              key={p.key}
              onClick={() => applyRange(p.range.from, p.range.to, p.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-editorial",
                active ? "bg-brand-500 text-white" : "bg-paper text-ink/60 hover:bg-brand-50 hover:text-brand-700"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-paper px-2 py-1">
        <input
          type="date"
          value={current.from}
          max={current.to}
          onChange={(e) => applyRange(e.target.value, current.to, null)}
          className="rounded-full bg-transparent px-1.5 py-0.5 text-xs text-ink/70 outline-none"
          aria-label="From date"
        />
        <span className="text-xs text-ink/30">–</span>
        <input
          type="date"
          value={current.to}
          min={current.from}
          onChange={(e) => applyRange(current.from, e.target.value, null)}
          className="rounded-full bg-transparent px-1.5 py-0.5 text-xs text-ink/70 outline-none"
          aria-label="To date"
        />
      </div>
    </div>
  );
}
