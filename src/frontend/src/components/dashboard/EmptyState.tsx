import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Primary call-to-action label. */
  actionLabel?: string;
  /** Navigation target for the primary CTA, e.g. "/chat". */
  actionTo?: string;
  /** Optional secondary, less prominent line shown under the description. */
  hint?: string;
  ocid: string;
  className?: string;
};

/**
 * Shared empty-state surface. Used across the dashboard when there is no
 * history, no workflows, or no preferences yet. Always offers a next step —
 * normally directing first-time users to the chat to create their first plan.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  hint,
  ocid,
  className,
}: EmptyStateProps) {
  return (
    <div
      data-ocid={ocid}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      {hint && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
          {hint}
        </p>
      )}

      {actionLabel && actionTo && (
        <Button asChild size="sm" data-ocid={`${ocid}.primary_button`}>
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
