import { Brain, Loader2 } from "lucide-react";

import { DAppEditor } from "@/components/memory/DAppEditor";
import { NotesEditor } from "@/components/memory/NotesEditor";
import { RulesEditor } from "@/components/memory/RulesEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetPreferences } from "@/hooks/use-preferences";

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
  const { data, isLoading, isError, error, refetch, isFetching } =
    useGetPreferences();

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
              Manage the dApps, rules, and notes the agent carries across every
              plan. Stored on-chain, visible only to you.
            </p>
          </div>
        </div>
      </header>

      {isLoading || (isFetching && !data) ? (
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
              : "Something went wrong while fetching your on-chain data."}
          </p>
          <button
            type="button"
            data-ocid="memory.retry_button"
            onClick={() => void refetch()}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Loader2 className="h-4 w-4" aria-hidden />
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          <DAppEditor dApps={data?.dApps ?? []} />
          <div className="h-px bg-border" />
          <RulesEditor rules={data?.rules ?? []} />
          <div className="h-px bg-border" />
          <NotesEditor notes={data?.notes ?? ""} />
        </div>
      )}
    </section>
  );
}

export default MemoryPage;
