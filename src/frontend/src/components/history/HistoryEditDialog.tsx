import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateHistoryEntry } from "@/hooks/use-history";
import type { HistoryEntry } from "@/types";

// Match backend caps (lib/core.mo) so validation fails client-side first and
// we avoid a wasted update call when the text is too long.
const MAX_GOAL_CHARS = 2_000;
const MAX_PLAN_TEXT_CHARS = 16_000;

type HistoryEditDialogProps = {
  entry: HistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocidPrefix?: string;
};

/**
 * Edit a history plan's goal + plan text. Single local update call (no AI
 * outcall) so cycle cost stays low.
 */
export function HistoryEditDialog({
  entry,
  open,
  onOpenChange,
  ocidPrefix = "history.edit",
}: HistoryEditDialogProps) {
  const updateEntry = useUpdateHistoryEntry();
  const [goal, setGoal] = useState("");
  const [planText, setPlanText] = useState("");

  useEffect(() => {
    if (open && entry) {
      setGoal(entry.goal);
      setPlanText(entry.planText);
    }
  }, [open, entry]);

  const trimmedGoal = goal.trim();
  const trimmedPlan = planText.trim();
  const isDirty =
    !!entry &&
    (trimmedGoal !== entry.goal.trim() ||
      trimmedPlan !== entry.planText.trim());
  const goalTooLong = goal.length > MAX_GOAL_CHARS;
  const planTooLong = planText.length > MAX_PLAN_TEXT_CHARS;
  const canSave =
    !!entry &&
    trimmedGoal.length > 0 &&
    trimmedPlan.length > 0 &&
    isDirty &&
    !goalTooLong &&
    !planTooLong &&
    !updateEntry.isPending;

  const handleSave = () => {
    if (!entry || !canSave) return;
    updateEntry.mutate(
      {
        id: entry.id,
        goal: trimmedGoal,
        planText: trimmedPlan,
      },
      {
        onSuccess: (saved) => {
          if (!saved) {
            toast.error("Save failed — plan not found.");
            return;
          }
          toast.success("Plan updated.");
          onOpenChange(false);
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : "Could not update plan.";
          toast.error("Could not update plan", { description: message });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-ocid={`${ocidPrefix}_dialog`}
        className="flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
          <DialogDescription>
            Update the goal or numbered plan steps. This is a local save — no AI
            call, minimal cycles.
          </DialogDescription>
        </DialogHeader>

        <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto py-2">
          <div className="space-y-2">
            <Label
              htmlFor="history-edit-goal"
              data-ocid={`${ocidPrefix}.goal_label`}
            >
              Goal
            </Label>
            <Input
              id="history-edit-goal"
              data-ocid={`${ocidPrefix}.goal_input`}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What this plan is for"
              maxLength={MAX_GOAL_CHARS + 50}
              disabled={updateEntry.isPending}
            />
            <p className="font-mono text-[11px] text-muted-foreground/60">
              {goal.length}/{MAX_GOAL_CHARS}
              {goalTooLong ? " — too long" : ""}
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="history-edit-plan"
              data-ocid={`${ocidPrefix}.plan_label`}
            >
              Plan
            </Label>
            <Textarea
              id="history-edit-plan"
              data-ocid={`${ocidPrefix}.plan_input`}
              value={planText}
              onChange={(e) => setPlanText(e.target.value)}
              placeholder="Numbered MCP-ready steps…"
              rows={12}
              className="font-mono text-xs leading-relaxed"
              disabled={updateEntry.isPending}
            />
            <p className="font-mono text-[11px] text-muted-foreground/60">
              {planText.length}/{MAX_PLAN_TEXT_CHARS}
              {planTooLong ? " — too long" : ""}
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            data-ocid={`${ocidPrefix}.cancel_button`}
            onClick={() => onOpenChange(false)}
            disabled={updateEntry.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-ocid={`${ocidPrefix}.save_button`}
            onClick={handleSave}
            disabled={!canSave}
          >
            {updateEntry.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
