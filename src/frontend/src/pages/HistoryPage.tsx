import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, History, Loader2, Plus } from "lucide-react";

import { HistoryEntryCard } from "@/components/history/HistoryEntryCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListHistory } from "@/hooks/use-history";
import type { HistoryEntry } from "@/types";

function HistorySkeleton() {
  return (
    <output
      className="space-y-3"
      data-ocid="history.loading_state"
      aria-label="Loading history"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
          key={i}
          className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-subtle"
        >
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      ))}
    </output>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"
      data-ocid="history.empty_state"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <History className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
          No plans yet
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Plans you generate from a goal will appear here in chronological
          order. Open one any time to keep refining it in chat.
        </p>
      </div>
      <Button
        type="button"
        data-ocid="history.empty_state.start_button"
        onClick={onStart}
        className="mt-2"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Start a new plan
      </Button>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
      data-ocid="history.error_state"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="font-display text-base font-semibold text-foreground">
          Couldn’t load history
        </h2>
        <p className="text-sm text-muted-foreground">
          We were unable to fetch your plan history from the canister.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        data-ocid="history.error_state.retry_button"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}

export function HistoryPage() {
  const { data, isLoading, isError, refetch, isFetching } = useListHistory();
  const navigate = useNavigate();

  // Newest first — listHistory returns chronological order; reverse for
  // most-recent-first display.
  const entries: HistoryEntry[] = (data ?? []).slice().reverse();

  const goToChat = () => {
    void navigate({
      to: "/chat",
      search: { historyId: undefined, plan: undefined },
    });
  };

  return (
    <section className="space-y-6" data-ocid="history.page">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1
            className="font-display text-2xl font-semibold tracking-tight text-foreground"
            data-ocid="history.title"
          >
            History
          </h1>
          <p className="text-sm text-muted-foreground">
            Every plan you’ve generated, stored on-chain. Click any entry to
            reopen it in chat for further refinement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading ? (
            <Loader2
              className="h-4 w-4 animate-spin text-muted-foreground"
              aria-label="Refreshing history"
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="history.new_plan_button"
            onClick={goToChat}
          >
            <Plus className="h-4 w-4" aria-hidden />
            New plan
          </Button>
        </div>
      </header>

      {isLoading ? (
        <HistorySkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState onStart={goToChat} />
      ) : (
        <div className="space-y-3" data-ocid="history.list">
          {entries.map((entry, i) => (
            <HistoryEntryCard key={entry.id} entry={entry} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}

export default HistoryPage;
