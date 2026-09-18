"use client";

import { useId, useState } from "react";
import { cn, formatPercent } from "@/lib/utils";

/**
 * The plain-language explanation behind a figure. Everything here is prepared
 * by the server component that owns the numbers, so this file never does
 * arithmetic or formatting of its own — it only decides what to show and when.
 */
export interface TileExplanation {
  /** One sentence: what this number is, in the owner's own terms. */
  summary: string;
  /** The sum itself, already formatted, e.g. "QAR 146,983 − QAR 74,766 = QAR 72,217". */
  formula?: string;
  /** The parts that add up to the figure. */
  rows?: { label: string; value: string }[];
  /** Anything that would otherwise be read the wrong way. */
  caveat?: string;
}

function InfoIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={cn("transition-editorial", open ? "text-brand-600" : "text-ink/25")}
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="5.1" r="0.85" fill="currentColor" />
    </svg>
  );
}

function ComparisonPill({ changePct, label }: { changePct: number | null; label: string }) {
  if (changePct === null) {
    return <span className="text-xs text-ink/30">no {label} to compare</span>;
  }
  const up = changePct > 0;
  const flat = Math.abs(changePct) < 0.5;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        flat ? "text-ink/40" : up ? "text-emerald-600" : "text-red-500"
      )}
    >
      {!flat && (up ? "▲" : "▼")}
      {formatPercent(Math.abs(changePct))} <span className="text-ink/35">vs {label}</span>
    </span>
  );
}

/**
 * A figure that explains itself. Clicking the tile opens a short panel saying
 * what the number is and how it was worked out, so nobody has to go back to
 * the spreadsheet to trust what they're looking at.
 */
export function MetricTile({
  label,
  value,
  changePct,
  comparisonLabel,
  explanation,
  tone = "neutral",
}: {
  label: string;
  value: string;
  changePct: number | null;
  comparisonLabel: string;
  explanation: TileExplanation;
  tone?: "neutral" | "signed";
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const negative = tone === "signed" && value.trim().startsWith("-");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="group w-full rounded-lg text-left transition-editorial hover:bg-paper/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink/40">{label}</span>
          <InfoIcon open={open} />
        </span>
        <span className={cn("mt-2 block font-display text-2xl", negative ? "text-red-600" : "text-ink")}>
          {value}
        </span>
        <span className="mt-2 block">
          <ComparisonPill changePct={changePct} label={comparisonLabel} />
        </span>
      </button>

      {open && (
        <div id={panelId} className="mt-3 rounded-lg bg-paper px-3.5 py-3 text-xs leading-relaxed text-ink/70">
          <p>{explanation.summary}</p>

          {explanation.rows && explanation.rows.length > 0 && (
            <ul className="mt-2.5 space-y-1">
              {explanation.rows.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-3">
                  <span className="text-ink/50">{row.label}</span>
                  <span className="font-medium text-ink/80">{row.value}</span>
                </li>
              ))}
            </ul>
          )}

          {explanation.formula && (
            <p className="mt-2.5 rounded bg-white px-2.5 py-1.5 font-medium text-ink/80">{explanation.formula}</p>
          )}

          {explanation.caveat && <p className="mt-2.5 text-ink/50">{explanation.caveat}</p>}
        </div>
      )}
    </div>
  );
}
