import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  useAddRule,
  useDeleteRule,
  useUpdateRule,
} from "@/hooks/use-preferences";
import type { Rule } from "@/types";

type RulesEditorProps = {
  rules: Rule[];
};

export function RulesEditor({ rules }: RulesEditorProps) {
  const addRule = useAddRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();

  const [addText, setAddText] = useState("");
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [editText, setEditText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Rule | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    setError(null);
    addRule.mutate(trimmed, {
      onSuccess: () => setAddText(""),
      onError: (e) =>
        setError(e instanceof Error ? e.message : "Failed to add rule"),
    });
  };

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditText(rule.text);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = (rule: Rule) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setError(null);
    updateRule.mutate(
      { id: rule.id, text: trimmed },
      {
        onSuccess: () => cancelEdit(),
        onError: (e) =>
          setError(e instanceof Error ? e.message : "Failed to update rule"),
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setError(null);
    deleteRule.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
      onError: (e) => {
        setError(e instanceof Error ? e.message : "Failed to delete rule");
        setPendingDelete(null);
      },
    });
  };

  const isAddBusy = addRule.isPending;
  const isEditBusy = updateRule.isPending;
  const isDeleteBusy = deleteRule.isPending;

  return (
    <section
      data-ocid="memory.rules.section"
      className="space-y-4"
      aria-labelledby="rules-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2
            id="rules-heading"
            className="font-display text-lg font-semibold tracking-tight text-foreground"
          >
            Rules &amp; constraints
          </h2>
          <p className="text-sm text-muted-foreground">
            Free-text guardrails the agent should always respect when planning.
          </p>
        </div>
      </div>

      {/* Add form */}
      <div
        data-ocid="memory.rules.add_form"
        className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-4 sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <label htmlFor="rule-input" className="sr-only">
            New rule
          </label>
          <Input
            id="rule-input"
            data-ocid="memory.rules.input"
            placeholder="e.g. Never spend more than 5 ICP without confirmation"
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            disabled={isAddBusy}
          />
        </div>
        <Button
          type="button"
          data-ocid="memory.rules.add_button"
          onClick={handleAdd}
          disabled={!addText.trim() || isAddBusy}
          className="sm:mb-0"
        >
          {isAddBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-4 w-4" aria-hidden />
          )}
          Add rule
        </Button>
      </div>

      {error && (
        <p
          data-ocid="memory.rules.error_state"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* List */}
      {rules.length === 0 ? (
        <div
          data-ocid="memory.rules.empty_state"
          className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center"
        >
          <p className="font-display text-sm font-medium text-foreground">
            No rules defined
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a constraint above to steer the agent&apos;s behavior.
          </p>
        </div>
      ) : (
        <ol
          data-ocid="memory.rules.list"
          className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
        >
          {rules.map((rule, index) => {
            const isEditing = editingId === rule.id;
            return (
              <li
                key={rule.id.toString()}
                data-ocid={`memory.rules.item.${index}`}
                className="flex items-start gap-3 p-4"
              >
                {isEditing ? (
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      data-ocid={`memory.rules.edit_input.${index}`}
                      aria-label="Edit rule"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(rule);
                        if (e.key === "Escape") cancelEdit();
                      }}
                      disabled={isEditBusy}
                      autoFocus
                    />
                    <div className="flex gap-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-ocid={`memory.rules.cancel_button.${index}`}
                        onClick={cancelEdit}
                        disabled={isEditBusy}
                      >
                        <X className="h-4 w-4" aria-hidden />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        data-ocid={`memory.rules.save_button.${index}`}
                        onClick={() => saveEdit(rule)}
                        disabled={!editText.trim() || isEditBusy}
                      >
                        {isEditBusy ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          <Check className="h-4 w-4" aria-hidden />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[10px] font-semibold text-primary"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                      {rule.text}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-ocid={`memory.rules.edit_button.${index}`}
                        aria-label={`Edit rule ${index + 1}`}
                        onClick={() => startEdit(rule)}
                        disabled={isEditBusy || isDeleteBusy}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-ocid={`memory.rules.delete_button.${index}`}
                        aria-label={`Delete rule ${index + 1}`}
                        onClick={() => setPendingDelete(rule)}
                        disabled={isEditBusy || isDeleteBusy}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="memory.rules.delete_modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this rule?</AlertDialogTitle>
            <AlertDialogDescription>
              The agent will no longer be constrained by this rule. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="memory.rules.delete_cancel_button"
              disabled={isDeleteBusy}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="memory.rules.delete_confirm_button"
              onClick={confirmDelete}
              disabled={isDeleteBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleteBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
