import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type QuickAccessCardProps = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  ocid: string;
  /** Optional badge rendered top-right of the card (e.g. a count). */
  badge?: string | number;
  /** When provided, the card renders as a primary/accent-tinted surface. */
  featured?: boolean;
};

/**
 * Quick-access navigation card used on the dashboard. Renders as an anchor
 * styled like a card so the whole surface is clickable, with a clear hover
 * and focus-visible treatment. Kept presentational — navigation is owned by
 * the `to` prop consumed through TanStack Router's <Link>.
 */
export function QuickAccessCard({
  to,
  label,
  description,
  icon: Icon,
  ocid,
  badge,
  featured = false,
}: QuickAccessCardProps) {
  return (
    <a
      href={to}
      data-ocid={ocid}
      aria-label={`${label} — ${description}`}
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border p-5 transition-smooth",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        featured
          ? "border-primary/40 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors",
            featured
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-secondary text-muted-foreground group-hover:text-primary",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>

        {badge !== undefined && badge !== "" && (
          <span
            data-ocid={`${ocid}.badge`}
            className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground"
          >
            {badge}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
          {label}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
        <span>Open</span>
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </a>
  );
}
