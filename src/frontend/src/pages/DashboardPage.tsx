import {
  Brain,
  History,
  MessageSquare,
  Sparkles,
  Workflow,
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { QuickAccessCard } from "@/components/dashboard/QuickAccessCard";
import { RecentPlans } from "@/components/dashboard/RecentPlans";
import { Skeleton } from "@/components/ui/skeleton";
import { useListHistory } from "@/hooks/use-history";
import { useGetPreferences } from "@/hooks/use-preferences";
import { useListWorkflows } from "@/hooks/use-workflows";

const QUICK_ACCESS = [
  {
    to: "/chat",
    label: "Chat",
    description: "Describe a goal and generate a step-by-step plan.",
    icon: MessageSquare,
    ocid: "dashboard.quick_access.chat",
    featured: true,
  },
  {
    to: "/workflows",
    label: "Workflows",
    description: "Browse, edit, and reuse your saved plans.",
    icon: Workflow,
    ocid: "dashboard.quick_access.workflows",
  },
  {
    to: "/memory",
    label: "Memory",
    description: "Tune preferences, rules, and trusted dApps.",
    icon: Brain,
    ocid: "dashboard.quick_access.memory",
  },
  {
    to: "/history",
    label: "History",
    description: "Review every plan you have generated.",
    icon: History,
    ocid: "dashboard.quick_access.history",
  },
] as const;

/**
 * Dashboard (/) — the signed-in landing surface.
 *
 * Shows an overview of recent plans (last 5 from history), the count of saved
 * workflows, and quick-access cards to Chat, Workflows, Memory, and History.
 * First-time users (no workflows, no history, no preferences) see clear empty
 * states with onboarding guidance directing them to the chat to create their
 * first plan.
 */
export default function DashboardPage() {
  const historyQuery = useListHistory();
  const workflowsQuery = useListWorkflows();
  const preferencesQuery = useGetPreferences();

  const history = historyQuery.data;
  const workflows = workflowsQuery.data;
  const preferences = preferencesQuery.data;

  const historyLoading = historyQuery.isLoading;
  const workflowsLoading = workflowsQuery.isLoading;
  const preferencesLoading = preferencesQuery.isLoading;

  const workflowCount = workflows?.length ?? 0;
  const historyCount = history?.length ?? 0;
  const hasPreferences = !!preferences;

  // First-time user: nothing saved anywhere yet.
  const isFirstTime =
    !historyLoading &&
    !workflowsLoading &&
    !preferencesLoading &&
    historyCount === 0 &&
    workflowCount === 0 &&
    !hasPreferences;

  return (
    <div data-ocid="dashboard.page" className="space-y-8">
      <header className="space-y-2" data-ocid="dashboard.header">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Overview
          </span>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Dashboard
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Generate plans from natural-language goals, save reusable workflows,
          and keep your preferences on-chain. Everything here is yours alone.
        </p>
      </header>

      {isFirstTime ? (
        <EmptyState
          ocid="dashboard.onboarding.empty_state"
          icon={Sparkles}
          title="Welcome — let's create your first plan"
          description="You have no plans, workflows, or preferences yet. Head to the chat, describe a goal in plain language, and the agent will draft a step-by-step plan you can save and reuse."
          hint="first-time · onboarding"
          actionLabel="Open chat"
          actionTo="/chat"
        />
      ) : null}

      {/* Stats row */}
      <section
        data-ocid="dashboard.stats.section"
        aria-label="At a glance"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <StatCard
          ocid="dashboard.stats.workflows"
          label="Saved workflows"
          value={workflowsLoading ? null : workflowCount}
        />
        <StatCard
          ocid="dashboard.stats.history"
          label="Plans in history"
          value={historyLoading ? null : historyCount}
        />
        <StatCard
          ocid="dashboard.stats.preferences"
          label="Preferences set"
          value={preferencesLoading ? null : hasPreferences ? "Yes" : "No"}
        />
      </section>

      {/* Quick access */}
      <section
        data-ocid="dashboard.quick_access.section"
        aria-labelledby="quick-access-heading"
        className="space-y-4"
      >
        <h2
          id="quick-access-heading"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Quick access
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACCESS.map((card) => (
            <QuickAccessCard
              key={card.to}
              to={card.to}
              label={card.label}
              description={card.description}
              icon={card.icon}
              ocid={card.ocid}
              featured={"featured" in card && card.featured}
              badge={
                card.to === "/workflows" && !workflowsLoading
                  ? workflowCount
                  : card.to === "/history" && !historyLoading
                    ? historyCount
                    : undefined
              }
            />
          ))}
        </div>
      </section>

      {/* Recent plans */}
      <RecentPlans history={history} isLoading={historyLoading} />
    </div>
  );
}

function StatCard({
  label,
  value,
  ocid,
}: {
  label: string;
  value: string | number | null;
  ocid: string;
}) {
  return (
    <div
      data-ocid={ocid}
      className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4"
    >
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      {value === null ? (
        <Skeleton className="h-7 w-12" data-ocid={`${ocid}.skeleton`} />
      ) : (
        <span
          className="font-display text-2xl font-semibold tracking-tight text-foreground"
          data-ocid={`${ocid}.value`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
