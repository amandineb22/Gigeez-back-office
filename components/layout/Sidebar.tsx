"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { theme } from "@/theme/config";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  // Carry the global filters (date range, display currency) across navigation,
  // so picking EUR on the dashboard doesn't silently revert to QAR on Sales.
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const suffix = query ? `?${query}` : "";

  return (
    <div className="flex h-full w-64 flex-col border-r border-ink/5 bg-white">
      <div className="px-6 pb-5 pt-6">
        <Link href="/" className="block" onClick={onNavigate}>
          <Image
            src={theme.logo.mark}
            alt={theme.logo.text}
            width={theme.logo.width}
            height={theme.logo.height}
            className="h-32 w-32 object-contain"
            priority
          />
        </Link>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={`${item.href}${suffix}`}
              onClick={onNavigate}
              className={cn(
                "block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-editorial",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink/60 hover:bg-paper hover:text-ink"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-5 text-xs text-ink/30">Internal use only</div>
    </div>
  );
}
