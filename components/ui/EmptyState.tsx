import { LinkButton } from "./Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/10 bg-white/50 px-6 py-16 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink/50">{description}</p>
      {actionLabel && actionHref && (
        <LinkButton href={actionHref} size="sm" className="mt-5">
          {actionLabel}
        </LinkButton>
      )}
    </div>
  );
}
