"use client";

import { Suspense } from "react";
import { DateRangeFilter } from "./DateRangeFilter";
import { CurrencyFilter } from "./CurrencyFilter";

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-ink/5 bg-white/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-ink/60 hover:bg-paper md:hidden"
        aria-label="Open menu"
      >
        <MenuIcon />
      </button>
      <Suspense fallback={<div className="h-7" />}>
        <DateRangeFilter />
      </Suspense>
      <Suspense fallback={<div className="h-7" />}>
        <CurrencyFilter />
      </Suspense>
    </header>
  );
}
