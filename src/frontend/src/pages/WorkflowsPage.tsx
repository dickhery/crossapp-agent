import { useNavigate } from "@tanstack/react-router";
import { Loader2, Workflow } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { WorkflowSearch } from "@/components/workflows/WorkflowSearch";
import { useListWorkflows, useSearchWorkflows } from "@/hooks/use-workflows";
import type { Workflow as WorkflowType } from "@/types";

// Favorites are pinned to the top of the list; within each group the most
// recently updated workflow comes first. This keeps the surface useful without
// a separate "favorites" tab.
const sortWorkflows = (items: WorkflowType[]): WorkflowType[] => {
  const copy = [...items];
  copy.sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return Number(b.updatedAt) - Number(a.updatedAt);
  });
  return copy;
};

export function WorkflowsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const list = useListWorkflows();
  const search = useSearchWorkflows(query);

  const isSearching = query.trim().length > 0;

  // When searching, the backend search result is authoritative. Otherwise we
  // show the full list. Favorites are always surfaced at the top.
  const workflows = useMemo(() => {
    if (isSearching) {
      return search.data ? sortWorkflows(search.data) : [];
    }
    return list.data ? sortWorkflows(list.data) : [];
  }, [isSearching, search.data, list.data]);

  const isLoading = isSearching ? search.isLoading : list.isLoading;
  const isError = isSearching ? search.isError : list.isError;
  const total = list.data?.length ?? 0;

  return (
    <section className="space-y-6" data-ocid="workflows.page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1
            className="font-display text-2xl font-semibold tracking-tight text-foreground"
            data-ocid="workflows.title"
          >
            Workflows
          </h1>
          <p className="text-sm text-muted-foreground">
            Saved plans you can reuse, refine, and run against your dapps.
          </p>
        </div>
        <Button
          data-ocid="workflows.new_button"
          onClick={() =>
            void navigate({
              to: "/chat",
              search: { historyId: undefined, plan: undefined },
            })
          }
        >
          <Workflow className="h-4 w-4" aria-hidden />
          New workflow
        </Button>
      </header>

      <WorkflowSearch
        value={query}
        onChange={setQuery}
        resultCount={workflows.length}
        total={total}
      />

      {isError ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center"
          data-ocid="workflows.error_state"
        >
          <p className="text-sm text-destructive">Could not load workflows.</p>
          <Button
            variant="outline"
            size="sm"
            data-ocid="workflows.retry_button"
            onClick={() =>
              isSearching ? void search.refetch() : void list.refetch()
            }
          >
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          data-ocid="workflows.loading_state"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
              key={i}
              data-ocid={`workflows.skeleton.${i}`}
              className="h-44 w-full rounded-xl"
            />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-20 text-center"
          data-ocid="workflows.empty_state"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-secondary text-muted-foreground">
            <Workflow className="h-6 w-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-display text-base font-medium text-foreground">
              {isSearching ? "No matching workflows" : "No workflows yet"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {isSearching
                ? "Try a different name or tag, or clear the search."
                : "Generate a plan from Chat and save it here to reuse later."}
            </p>
          </div>
          {isSearching ? (
            <Button
              variant="outline"
              size="sm"
              data-ocid="workflows.clear_search_button"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          ) : (
            <Button
              size="sm"
              data-ocid="workflows.empty_new_button"
              onClick={() =>
                void navigate({
                  to: "/chat",
                  search: { historyId: undefined, plan: undefined },
                })
              }
            >
              <Workflow className="h-4 w-4" aria-hidden />
              Start a new workflow
            </Button>
          )}
        </div>
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          data-ocid="workflows.list"
        >
          {workflows.map((wf, i) => (
            <WorkflowCard key={wf.id} workflow={wf} index={i} />
          ))}
        </div>
      )}

      {isLoading && (
        <div
          className="flex items-center justify-center gap-2 pt-2 text-muted-foreground"
          aria-hidden
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="font-mono text-[11px] uppercase tracking-widest">
            loading
          </span>
        </div>
      )}
    </section>
  );
}
