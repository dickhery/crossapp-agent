import { Link, useNavigate, useSearch } from "@tanstack/react-router";
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
import { useGeneratePlan, useRefinePlan } from "@/hooks/use-chat";
import { useGetHistoryEntry } from "@/hooks/use-history";
import { useCreateWorkflow } from "@/hooks/use-workflows";
import type { Conversation } from "@/types";

// ChatPage owns the single active conversation. Plans are MCP-ready workflows
// to copy into Grok/Claude — this app does not execute them on-chain.

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
  const generatePlan = useGeneratePlan();
  const refinePlan = useRefinePlan();
  const createWorkflow = useCreateWorkflow();

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

  const scrollRef = useRef<HTMLDivElement>(null);

  const isPending = generatePlan.isPending || refinePlan.isPending;

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll targets the latest turn only
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns, isPending]);

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
    if (turns.length === 0) {
      void handleNewGoal(text);
    } else {
      void handleRefine(text);
    }
  };

  const handleRetry = () => {
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
        description: `"${name}" is in Workflows — open it anytime and Copy for MCP.`,
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
                    isSavingPlan={createWorkflow.isPending}
                    isLastAssistant={isLastAssistant}
                  />
                );
              })}

              {isPending && <ChatMessageLoading />}

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

      <div className="border-t border-border bg-background/80 px-1 py-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput
            onSubmit={handleSubmit}
            isPending={isPending}
            disabled={isPending}
            placeholder={
              turns.length === 0
                ? "Describe a goal — e.g. check ICP balance, migrate NFTs…"
                : "Refine the plan — e.g. 'add a dry-run step' or 'use my vault canister'…"
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
    "Check my ICP balance on the NNS ledger via MCP",
    "Move rare NFTs from Marketplace X into my vault, re-list the rest on Y",
    "Migrate my DeFi position while staying cycle-conscious",
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
          Build workflows. Run them in your AI agent.
        </h2>
        <p className="mx-auto max-w-lg text-sm text-muted-foreground">
          CrossApp Agent helps you set up the IC MCP connector, store Memory
          (apps &amp; rules), and draft numbered workflows with real MCP tool
          hints. Then <strong className="text-foreground">Copy for MCP</strong>{" "}
          and paste into Grok or Claude — the agent executes under your Internet
          Identity.
        </p>
        <p className="text-xs text-muted-foreground">
          New here? Complete{" "}
          <Link to="/setup" className="text-primary hover:underline">
            Setup
          </Link>{" "}
          first, then seed{" "}
          <Link to="/memory" className="text-primary hover:underline">
            Memory
          </Link>
          .
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
              Store this MCP-ready plan on-chain under your Internet Identity.
              From Workflows you can reopen it, edit steps, and{" "}
              <strong>Copy for MCP</strong> again anytime.
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
                placeholder="e.g. Check NNS ICP balance via MCP"
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
                placeholder="When to use this workflow and which dApps it touches…"
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
                placeholder="nns, icp, balance, mcp"
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
