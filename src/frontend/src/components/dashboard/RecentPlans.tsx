import { Link, useNavigate } from "@tanstack/react-router";
import { History, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { HistoryEditDialog } from "@/components/history/HistoryEditDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteHistoryEntry } from "@/hooks/use-history";
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
 * Supports reopen, edit, and delete without leaving the overview.
 */
export function RecentPlans({ history, isLoading }: RecentPlansProps) {
  const navigate = useNavigate();
  const deleteEntry = useDeleteHistoryEntry();
  const [editEntry, setEditEntry] = useState<HistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null);

  const recent = (history ?? [])
    .slice()
    .sort((a, b) => Number(b.createdAt - a.createdAt))
    .slice(0, RECENT_LIMIT);

  const handleReopen = (entry: HistoryEntry) => {
    void navigate({
      to: "/chat",
      search: { historyId: entry.id.toString(), plan: undefined },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    deleteEntry.mutate(target.id, {
      onSuccess: (ok) => {
        setDeleteTarget(null);
        if (ok) {
          toast.success("Plan deleted from history.");
        } else {
          toast.error("Plan not found — it may already be deleted.");
        }
      },
      onError: () => toast.error("Could not delete plan."),
    });
  };

  const isDeleting = deleteEntry.isPending;

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
        <Link
          to="/history"
          data-ocid="dashboard.recent_plans.view_all_link"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          View all
        </Link>
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
              <div
                data-ocid={`dashboard.recent_plans.item.${i + 1}`}
                className="group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition-smooth hover:border-primary/40 hover:bg-secondary"
              >
                <button
                  type="button"
                  onClick={() => handleReopen(entry)}
                  data-ocid={`dashboard.recent_plans.open.${i + 1}`}
                  className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
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
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-ocid={`dashboard.recent_plans.edit.${i + 1}`}
                    aria-label={`Edit plan: ${entry.goal || "Untitled goal"}`}
                    onClick={() => setEditEntry(entry)}
                    disabled={isDeleting}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-ocid={`dashboard.recent_plans.delete.${i + 1}`}
                    aria-label={`Delete plan: ${entry.goal || "Untitled goal"}`}
                    onClick={() => setDeleteTarget(entry)}
                    disabled={isDeleting}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <HistoryEditDialog
        entry={editEntry}
        open={editEntry !== null}
        onOpenChange={(open) => {
          if (!open) setEditEntry(null);
        }}
        ocidPrefix="dashboard.recent_plans.edit"
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent data-ocid="dashboard.recent_plans.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan from history?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the plan for{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.goal || "Untitled goal"}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="dashboard.recent_plans.delete_cancel"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="dashboard.recent_plans.delete_confirm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive/60"
            >
              {isDeleting ? "Deleting…" : "Delete plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
