import { useNavigate } from "@tanstack/react-router";
import { Clock, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { useDeleteHistoryEntry } from "@/hooks/use-history";
import type { HistoryEntry } from "@/types";

// Format an IC nanosecond timestamp into a compact, readable absolute + relative
// pair. IC timestamps are bigint nanoseconds since epoch.
function formatTimestamp(ns: bigint): { absolute: string; relative: string } {
  const ms = Number(ns / 1_000_000n);
  const date = new Date(ms);

  const absolute = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const diffMs = Date.now() - ms;
  const seconds = Math.round(diffMs / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  let relative: string;
  if (diffMs < 0) {
    relative = "just now";
  } else if (seconds < 60) {
    relative = `${seconds}s ago`;
  } else if (minutes < 60) {
    relative = `${minutes}m ago`;
  } else if (hours < 24) {
    relative = `${hours}h ago`;
  } else if (days < 30) {
    relative = `${days}d ago`;
  } else {
    relative = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  }

  return { absolute, relative };
}

export function HistoryEntryCard({
  entry,
  index,
}: {
  entry: HistoryEntry;
  index: number;
}) {
  const navigate = useNavigate();
  const deleteEntry = useDeleteHistoryEntry();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { absolute, relative } = formatTimestamp(entry.createdAt);

  const handleReopen = () => {
    // Navigate to /chat with the history entry id so the chat view can load the
    // saved plan for further refinement.
    void navigate({
      to: "/chat",
      search: { historyId: entry.id.toString(), plan: undefined },
    });
  };

  const handleDelete = () => {
    deleteEntry.mutate(entry.id, {
      onSuccess: () => setConfirmOpen(false),
    });
  };

  const isDeleting = deleteEntry.isPending;

  return (
    <>
      <article
        data-ocid={`history.item.${index}`}
        className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-subtle transition-smooth hover:border-primary/40 hover:bg-secondary/40 sm:flex-row sm:items-center sm:gap-4"
      >
        {/* Clickable body — reopens the plan in chat */}
        <button
          type="button"
          data-ocid={`history.open_button.${index}`}
          onClick={handleReopen}
          className="flex flex-1 flex-col items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-lg"
        >
          <div className="flex w-full items-center gap-2 min-w-0">
            <MessageSquare
              className="h-4 w-4 shrink-0 text-primary"
              aria-hidden
            />
            <p
              className="min-w-0 flex-1 truncate font-display text-sm font-medium text-foreground"
              data-ocid={`history.goal.${index}`}
            >
              {entry.goal || "Untitled goal"}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span
              className="flex items-center gap-1 font-mono"
              data-ocid={`history.timestamp.${index}`}
            >
              <Clock className="h-3 w-3" aria-hidden />
              <span title={absolute}>{relative}</span>
            </span>
            <span className="hidden sm:inline text-muted-foreground/50">·</span>
            <span
              className="hidden sm:inline font-mono text-muted-foreground/70"
              data-ocid={`history.absolute.${index}`}
            >
              {absolute}
            </span>
          </div>
        </button>

        {/* Delete action — opens confirmation dialog */}
        <div className="flex shrink-0 items-center sm:ml-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-ocid={`history.delete_button.${index}`}
            aria-label={`Delete history entry: ${entry.goal || "Untitled goal"}`}
            onClick={() => setConfirmOpen(true)}
            disabled={isDeleting}
            className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </article>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-ocid={`history.delete_dialog.${index}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan from history?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the plan for{" "}
              <span className="font-medium text-foreground">
                {entry.goal || "Untitled goal"}
              </span>{" "}
              from your on-chain history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid={`history.delete_cancel.${index}`}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid={`history.delete_confirm.${index}`}
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive/60"
            >
              {isDeleting ? "Deleting…" : "Delete plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
