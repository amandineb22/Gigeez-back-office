"use client";

import { cn } from "@/lib/utils";

/** A submit button that asks for confirmation before letting its enclosing <form action={...}> fire. */
export function ConfirmSubmitButton({
  confirmMessage,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirmMessage: string }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-editorial hover:bg-red-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
