import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-editorial disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const variants = {
  primary: "bg-brand-500 text-white shadow-soft hover:bg-brand-600",
  secondary: "bg-white text-ink border border-ink/10 hover:bg-paper",
  ghost: "text-ink/60 hover:bg-paper hover:text-ink",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5",
  lg: "px-5 py-3",
};

interface ButtonOwnProps {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

type LinkButtonProps = ButtonOwnProps & React.ComponentProps<typeof Link>;

export function LinkButton({ variant = "primary", size = "md", className, ...props }: LinkButtonProps) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
