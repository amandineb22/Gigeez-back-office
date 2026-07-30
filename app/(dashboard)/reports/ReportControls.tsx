"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";

const GROUPINGS = [
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "year", label: "Yearly" },
];

export function ReportControls({ grouping, cashOnHand }: { grouping: string; cashOnHand: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cash, setCash] = useState(String(cashOnHand));

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-1">
        {GROUPINGS.map((g) => (
          <button
            key={g.value}
            onClick={() => setParam("grouping", g.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-editorial",
              grouping === g.value ? "bg-brand-500 text-white" : "bg-paper text-ink/60 hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setParam("cash", cash);
        }}
      >
        <label htmlFor="cash-on-hand" className="text-xs text-ink/50">
          Cash on hand
        </label>
        <Input
          id="cash-on-hand"
          type="number"
          step="0.01"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
          className="w-32 py-1.5 text-xs"
        />
        <Button type="submit" variant="secondary" size="sm">
          Update
        </Button>
      </form>
    </div>
  );
}
