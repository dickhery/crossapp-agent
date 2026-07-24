import { useActor } from "@caffeineai/core-infrastructure";
import { Brain, Loader2, RefreshCw } from "lucide-react";

import { createActor } from "@/backend";
import { DAppEditor } from "@/components/memory/DAppEditor";
import { NotesEditor } from "@/components/memory/NotesEditor";
import { RulesEditor } from "@/components/memory/RulesEditor";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPTY_PREFERENCES, useGetPreferences } from "@/hooks/use-preferences";

function PreferencesSkeleton() {
  return (
    <div
      data-ocid="memory.loading_state"
      className="space-y-10"
      aria-label="Loading preferences"
    >
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

export function MemoryPage() {
  const { actor, isFetching: actorFetching } = useActor(createActor);
  const { data, isLoading, isError, error, refetch, isFetched, isFetching } =
    useGetPreferences();

  // Only block the form on the *initial* load. Successful data is always a
  // Preferences object (empty arrays for first-time users). Treating null as
  // "no data" previously left the page in a permanent skeleton: useActor
  // remount invalidation refetched prefs, `!null` stayed true, editors
  // unmounted, and the loop never settled.
  const waitingForActor = actorFetching && !actor;
  const waitingForPrefs =
    !!actor && !isError && !isFetched && (isLoading || isFetching);
  const showLoading = waitingForActor || waitingForPrefs;

  const prefs = data ?? EMPTY_PREFERENCES;

  return (
    <section
      data-ocid="memory.page"
      className="space-y-10"
      aria-label="Memory and preferences"
    >
      <header className="space-y-2" data-ocid="memory.page.header">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Brain className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Memory &amp; Preferences
            </h1>
            <p className="text-sm text-muted-foreground">
              Register the IC dApps and canisters your agent may control, plus
              personal rules and notes. Stored on-chain under your Internet
              Identity only.
            </p>
          </div>
        </div>
      </header>

      {showLoading ? (
        <PreferencesSkeleton />
      ) : isError ? (
        <div
          data-ocid="memory.error_state"
          className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center"
          role="alert"
        >
          <p className="font-display text-sm font-medium text-foreground">
            Couldn&apos;t load your preferences
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Something went wrong while fetching your on-chain data. If this persists, sign out and sign in again."}
          </p>
          <Button
            type="button"
            data-ocid="memory.retry_button"
            onClick={() => void refetch()}
            className="mt-4"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        </div>
      ) : !actor ? (
        <div
          data-ocid="memory.actor_unavailable"
          className="rounded-lg border border-border bg-card p-6 text-center"
        >
          <p className="font-display text-sm font-medium text-foreground">
            Connecting to the backend…
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your session is signed in, but the canister client is not ready yet.
            Wait a moment or refresh the page.
          </p>
          <div className="mt-4 flex justify-center">
            <Loader2
              className="h-5 w-5 animate-spin text-primary"
              aria-hidden
            />
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {isFetching ? (
            <p
              data-ocid="memory.refetch_hint"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70"
            >
              Syncing with canister…
            </p>
          ) : null}
          <DAppEditor dApps={prefs.dApps} />
          <div className="h-px bg-border" />
          <RulesEditor rules={prefs.rules} />
          <div className="h-px bg-border" />
          <NotesEditor notes={prefs.notes} />
        </div>
      )}
    </section>
  );
}

export default MemoryPage;
