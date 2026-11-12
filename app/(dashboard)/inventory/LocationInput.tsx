"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/Field";

const NEW = "__new__";

/**
 * Dropdown of every known location, with a last "New location…" option that
 * swaps in a text box for a boutique that isn't on the list yet.
 */
export function LocationInput({
  id,
  name,
  locations,
  defaultValue,
  placeholder = "Choose a location…",
  className,
}: {
  id: string;
  name: string;
  locations: string[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const options = defaultValue && !locations.includes(defaultValue) ? [defaultValue, ...locations] : locations;
  const [choice, setChoice] = useState(defaultValue ?? "");

  if (choice === NEW) {
    return (
      <div className="flex items-center gap-2">
        <Input id={id} name={name} required autoFocus placeholder="New location name" className={className} />
        <button type="button" onClick={() => setChoice("")} className="text-xs text-ink/50 hover:text-ink">
          Back to list
        </button>
      </div>
    );
  }

  return (
    <Select id={id} name={name} required value={choice} onChange={(e) => setChoice(e.target.value)} className={className}>
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((loc) => (
        <option key={loc} value={loc}>
          {loc}
        </option>
      ))}
      <option value={NEW}>+ New location…</option>
    </Select>
  );
}
