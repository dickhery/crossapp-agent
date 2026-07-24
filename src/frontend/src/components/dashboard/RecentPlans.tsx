import { useNavigate } from "@tanstack/react-router";
import { History, MessageSquare } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import type { HistoryEntry } from "@/types";

const RECENT_LIMIT = 5;

/**
 * IC timestamps are nanoseconds since the Unix epoch. Convert to a relative
 * "x ago" string for display. Falls back to a locale date for older entries.
 */
function formatRelative(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  if (!Number.isFinite(ms)) return "";
  const diffMs = Date.now() - ms;
  if (diffMs < 0) return "just now";

  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export type RecentPlansProps = {
  history: HistoryEntry[] | undefined;
  isLoading: boolean;
};

/**
 * Renders the most recent plans (last 5 from history) on the dashboard.
 * Shows a layout-matched skeleton while loading and a helpful empty state
 * directing first-time users to the chat when there is no history yet.
 */
export function RecentPlans({ history, isLoading }: RecentPlansProps) {
  const navigate = useNavigate();
  const recent = (history ?? [])
    .slice()
    .sort((a, b) => Number(b.createdAt - a.createdAt))
    .slice(0, RECENT_LIMIT);

  // Reopen a specific recent plan in chat — deep-links to /chat with the
  // history entry id so ChatPage loads that exact plan, not the history list.
  const handleReopen = (entry: HistoryEntry) => {
    void navigate({
      to: "/chat",
      search: { historyId: entry.id.toString(), plan: undefined },
    });
  };

  return (
    <section
      data-ocid="dashboard.recent_plans.section"
      aria-labelledby="recent-plans-heading"
      className="space-y-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="recent-plans-heading"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Recent plans
        </h2>
        <a
          href="/history"
          data-ocid="dashboard.recent_plans.view_all_link"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          View all
        </a>
      </div>

      {isLoading ? (
        <ul
          className="space-y-3"
          data-ocid="dashboard.recent_plans.loading_state"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              key={i}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : recent.length === 0 ? (
        <EmptyState
          ocid="dashboard.recent_plans.empty_state"
          icon={History}
          title="No plans yet"
          description="Plans you generate from a goal will appear here. Start by describing what you want to accomplish in the chat."
          hint="first-time · onboarding"
          actionLabel="Create your first plan"
          actionTo="/chat"
        />
      ) : (
        <ul data-ocid="dashboard.recent_plans.list" className="space-y-3">
          {recent.map((entry, i) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => handleReopen(entry)}
                data-ocid={`dashboard.recent_plans.item.${i + 1}`}
                className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-smooth hover:border-primary/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors group-hover:text-primary">
                  <MessageSquare className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-display text-sm font-medium text-foreground">
                    {entry.goal || "Untitled goal"}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {entry.planText || "No plan text"}
                  </p>
                </div>
                <time
                  className="shrink-0 font-mono text-[11px] text-muted-foreground/70"
                  dateTime={new Date(
                    Number(entry.createdAt / 1_000_000n),
                  ).toISOString()}
                >
                  {formatRelative(entry.createdAt)}
                </time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
