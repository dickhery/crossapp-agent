import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ChatRole } from "@/backend";
import { ChatInput } from "@/components/chat/ChatInput";
import {
  ChatMessageItem,
  ChatMessageLoading,
} from "@/components/chat/ChatMessage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useGeneratePlan, useRefinePlan } from "@/hooks/use-chat";
import { useGetHistoryEntry } from "@/hooks/use-history";
import { useGetPreferences } from "@/hooks/use-preferences";
import { useCreateWorkflow } from "@/hooks/use-workflows";
import { executePlanInApp } from "@/lib/plan-executor";
import type { Conversation } from "@/types";

// ChatPage owns the single active conversation. A new goal clears the
// conversation and starts fresh; refinement messages append to it. Plans are
// detected by numbered-line structure and rendered with copy/save affordances.
// "Save as Workflow" opens a dialog to name + tag the plan before persisting.

type LocalTurn = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: bigint;
};

const nowNs = (): bigint => BigInt(Date.now() * 1_000_000);

const newId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const looksLikePlan = (text: string): boolean =>
  /(^|\n)\s*\d+[\.)]\s/m.test(text);

export function ChatPage() {
  const navigate = useNavigate();
  const { identity, principal } = useAuth();
  const preferencesQuery = useGetPreferences();
  const generatePlan = useGeneratePlan();
  const refinePlan = useRefinePlan();
  const createWorkflow = useCreateWorkflow();

  // Read the validated search params from the /chat route. `plan` carries a
  // workflow's plan text (from "Use this workflow"); `historyId` carries a
  // history entry id (from History / Dashboard recent plans). Either seeds the
  // single active conversation with the loaded plan as an assistant message.
  const { historyId: historyIdParam, plan: planParam } = useSearch({
    from: "/protected/chat",
  });

  const historyId = useMemo(() => {
    if (!historyIdParam) return undefined;
    try {
      return BigInt(historyIdParam);
    } catch {
      return undefined;
    }
  }, [historyIdParam]);

  const historyEntry = useGetHistoryEntry(historyId);

  const [turns, setTurns] = useState<LocalTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveTarget, setSaveTarget] = useState<LocalTurn | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  /** Most recent user goal text — used when executing a plan. */
  const lastGoalRef = useRef<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);

  // The active mutation (generate OR refine) — drives the loading bubble.
  const isPending = generatePlan.isPending || refinePlan.isPending || isRunning;

  // Seed the conversation once when a plan is provided via search params.
  // `plan` seeds directly from the workflow text; `historyId` seeds from the
  // fetched historical entry. We track the consumed key so re-navigation with
  // the same params doesn't re-seed (and a new key does).
  const seedKey =
    planParam ?? (historyIdParam ? `history:${historyIdParam}` : null);
  const consumedSeedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!seedKey || consumedSeedRef.current === seedKey) return;

    if (planParam) {
      consumedSeedRef.current = seedKey;
      setTurns([
        {
          id: newId(),
          role: ChatRole.assistant,
          content: planParam,
          timestamp: nowNs(),
        },
      ]);
      return;
    }

    if (historyIdParam && historyEntry.data) {
      consumedSeedRef.current = seedKey;
      const entry = historyEntry.data;
      setTurns([
        {
          id: newId(),
          role: ChatRole.user,
          content: entry.goal || "Reopened plan",
          timestamp: entry.createdAt,
        },
        {
          id: newId(),
          role: ChatRole.assistant,
          content: entry.planText || "",
          timestamp: entry.createdAt,
        },
      ]);
    }
  }, [seedKey, planParam, historyIdParam, historyEntry.data]);

  // Auto-scroll to the latest turn whenever the conversation grows or a
  // request starts/finishes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll targets the latest turn only
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, isPending]);

  // Build the Conversation payload sent to the backend from local turns.
  const conversation: Conversation = useMemo(
    () => ({
      messages: turns.map((t) => ({
        role: t.role,
        content: t.content,
        timestamp: t.timestamp,
      })),
    }),
    [turns],
  );

  const appendTurn = (turn: Omit<LocalTurn, "id">): LocalTurn => {
    const full = { ...turn, id: newId() };
    setTurns((prev) => [...prev, full]);
    return full;
  };

  const handleNewGoal = async (goal: string) => {
    setError(null);
    lastGoalRef.current = goal;
    // A new goal clears the single active conversation per the product spec.
    setTurns([]);
    appendTurn({ role: ChatRole.user, content: goal, timestamp: nowNs() });

    try {
      const result = await generatePlan.mutateAsync({
        goal,
        conversation: { messages: [] },
      });
      appendTurn({
        role: ChatRole.assistant,
        content: result.planText,
        timestamp: nowNs(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate plan.";
      setError(message);
    }
  };

  const handleRunPlan = async (planText: string) => {
    setError(null);
    setIsRunning(true);
    try {
      // Prefer the last user message as the goal; fall back to stored goal.
      const lastUser = [...turns]
        .reverse()
        .find((t) => t.role === ChatRole.user);
      const goal =
        lastUser?.content ??
        (lastGoalRef.current || "Execute the current plan");
      lastGoalRef.current = goal;

      const result = await executePlanInApp({
        goal,
        planText,
        identity,
        principal,
        dApps: preferencesQuery.data?.dApps ?? [],
      });

      appendTurn({
        role: ChatRole.assistant,
        content: result.summary,
        timestamp: nowNs(),
      });
      toast.success("Execution finished", {
        description: "See the results message in the chat.",
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to execute plan.";
      setError(message);
      toast.error("Execution failed", { description: message });
    } finally {
      setIsRunning(false);
    }
  };

  const handleRefine = async (instruction: string) => {
    setError(null);
    appendTurn({
      role: ChatRole.user,
      content: instruction,
      timestamp: nowNs(),
    });

    try {
      const result = await refinePlan.mutateAsync({
        instruction,
        conversation,
      });
      appendTurn({
        role: ChatRole.assistant,
        content: result.planText,
        timestamp: nowNs(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refine plan.";
      setError(message);
    }
  };

  const handleSubmit = (text: string) => {
    // If there are no turns yet, this is a new goal; otherwise it's a
    // refinement of the active plan.
    if (turns.length === 0) {
      void handleNewGoal(text);
    } else {
      void handleRefine(text);
    }
  };

  const handleRetry = () => {
    // Retry re-runs the last user instruction against the conversation
    // minus the failed assistant turn.
    const lastUserIndex = [...turns]
      .map((t) => t.role)
      .lastIndexOf(ChatRole.user);
    if (lastUserIndex === -1) return;
    const lastUser = turns[lastUserIndex];
    const trimmed = turns.slice(0, lastUserIndex);
    setTurns(trimmed);
    if (trimmed.length === 0) {
      void handleNewGoal(lastUser.content);
    } else {
      // Re-issue as a refinement against the trimmed conversation.
      void refinePlan
        .mutateAsync({
          instruction: lastUser.content,
          conversation: {
            messages: trimmed.map((t) => ({
              role: t.role,
              content: t.content,
              timestamp: t.timestamp,
            })),
          },
        })
        .then(
          (result) => {
            appendTurn({
              role: ChatRole.assistant,
              content: result.planText,
              timestamp: nowNs(),
            });
          },
          (err) => {
            setError(err instanceof Error ? err.message : "Retry failed.");
          },
        );
    }
  };

  const handleSaveWorkflow = async (
    name: string,
    description: string,
    tags: string[],
  ) => {
    if (!saveTarget) return;
    try {
      const wf = await createWorkflow.mutateAsync([
        name,
        description,
        tags,
        saveTarget.content,
        false,
      ]);
      setSaveTarget(null);
      toast.success("Workflow saved", {
        description: `"${name}" is now in your Workflows library.`,
      });
      void navigate({ to: "/workflows" });
      return wf;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save workflow.";
      toast.error("Could not save workflow", { description: message });
      throw err;
    }
  };

  const isEmpty = turns.length === 0 && !isPending && !error;
  const lastAssistantIndex = [...turns]
    .map((t) => t.role)
    .lastIndexOf(ChatRole.assistant);

  return (
    <section data-ocid="chat.page" className="flex h-full flex-col">
      {/* Conversation scroll area */}
      <div
        ref={scrollRef}
        data-ocid="chat.scroll_area"
        className="scrollbar-thin flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-3xl px-1 py-6">
          {isEmpty ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {turns.map((turn, index) => {
                const isAssistant = turn.role === ChatRole.assistant;
                const isLastAssistant =
                  isAssistant && index === lastAssistantIndex;
                const showPlanAffordances =
                  isAssistant && looksLikePlan(turn.content);
                return (
                  <ChatMessageItem
                    key={turn.id}
                    message={turn}
                    onSavePlan={
                      showPlanAffordances
                        ? () => setSaveTarget(turn)
                        : undefined
                    }
                    onRetryPlan={
                      showPlanAffordances && (error || isLastAssistant)
                        ? handleRetry
                        : undefined
                    }
                    onRunPlan={
                      showPlanAffordances && isLastAssistant
                        ? () => handleRunPlan(turn.content)
                        : undefined
                    }
                    isSavingPlan={createWorkflow.isPending}
                    isRunningPlan={isRunning}
                    isLastAssistant={isLastAssistant}
                  />
                );
              })}

              {isPending && (
                <ChatMessageLoading
                  label={
                    isRunning
                      ? "Executing on the Internet Computer…"
                      : undefined
                  }
                />
              )}

              {error && !isPending && (
                <Alert variant="destructive" data-ocid="chat.error_state">
                  <AlertCircle className="h-4 w-4" aria-hidden />
                  <AlertTitle>Something went wrong</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      data-ocid="chat.error_retry_button"
                      onClick={handleRetry}
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                      Try again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky composer */}
      <div className="border-t border-border bg-background/80 px-1 py-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            onSubmit={handleSubmit}
            isPending={isPending}
            disabled={isPending}
            placeholder={
              turns.length === 0
                ? "e.g. Check my ICP balance on the ledger…"
                : "Refine the plan, or press Run now on the plan to execute…"
            }
          />
        </div>
      </div>

      <SaveWorkflowDialog
        open={saveTarget !== null}
        onOpenChange={(open) => !open && setSaveTarget(null)}
        isSaving={createWorkflow.isPending}
        onSave={handleSaveWorkflow}
      />
    </section>
  );
}

function EmptyState() {
  const examples = [
    "Check the balance of ICP in the NNS ledger account",
    "Look up my ICP ledger balance for this app principal",
    "Migrate my DeFi position between protocols while minimizing cycles spend",
  ];
  return (
    <div
      data-ocid="chat.empty_state"
      className="flex flex-col items-center justify-center gap-6 py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Plan here. Run reads here. Full MCP in Grok.
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Describe a goal → get a plan → press <strong>Run now</strong> for
          in-browser ICP queries (e.g. ledger balance). For true multi-app
          actions under other dApp principals, use <strong>Copy for MCP</strong>{" "}
          into Grok with the IC connector.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {examples.map((ex, i) => (
          <span
            key={ex}
            data-ocid={`chat.empty_state.example.${i + 1}`}
            className="max-w-xs rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground"
          >
            {ex}
          </span>
        ))}
      </div>
    </div>
  );
}

type SaveWorkflowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaving: boolean;
  onSave: (
    name: string,
    description: string,
    tags: string[],
  ) => Promise<unknown>;
};

function SaveWorkflowDialog({
  open,
  onOpenChange,
  isSaving,
  onSave,
}: SaveWorkflowDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  // Reset fields when the dialog opens for a new plan.
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setTagsRaw("");
    }
  }, [open]);

  const tags = useMemo(
    () =>
      tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0),
    [tagsRaw],
  );

  const canSave = name.trim().length > 0 && !isSaving;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    try {
      await onSave(name.trim(), description.trim(), tags);
    } catch {
      // Error toast handled by caller.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid="chat.save_workflow_dialog"
        className="sm:max-w-md"
      >
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Save as Workflow</DialogTitle>
            <DialogDescription>
              Persist this plan to your on-chain workflow library. You can edit
              and reuse it later from the Workflows page.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label
                htmlFor="workflow-name"
                data-ocid="chat.save_workflow.name_label"
              >
                Name
              </Label>
              <Input
                id="workflow-name"
                data-ocid="chat.save_workflow.name_input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Token-gated community launch"
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="workflow-description"
                data-ocid="chat.save_workflow.description_label"
              >
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="workflow-description"
                data-ocid="chat.save_workflow.description_input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A short summary of what this workflow does…"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="workflow-tags"
                data-ocid="chat.save_workflow.tags_label"
              >
                Tags{" "}
                <span className="text-muted-foreground">(comma-separated)</span>
              </Label>
              <Input
                id="workflow-tags"
                data-ocid="chat.save_workflow.tags_input"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="launch, community, token"
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                data-ocid="chat.save_workflow.cancel_button"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              data-ocid="chat.save_workflow.confirm_button"
              disabled={!canSave}
            >
              {isSaving ? "Saving…" : "Save Workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
