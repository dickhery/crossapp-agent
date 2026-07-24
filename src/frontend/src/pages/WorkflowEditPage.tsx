import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Save,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useDeleteWorkflow,
  useDuplicateWorkflow,
  useGetWorkflow,
  useToggleFavorite,
  useUpdateWorkflow,
} from "@/hooks/use-workflows";
import type { Workflow } from "@/types";

// Tags are entered as comma-separated text and persisted as a trimmed string
// array. Empty entries are dropped so the backend never sees blank tags.
const parseTags = (raw: string): string[] =>
  raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

const tagsToText = (tags: string[]): string => tags.join(", ");

export function WorkflowEditPage() {
  const { id } = useParams({ from: "/protected/workflows/$id" });
  const workflowId = useMemo(() => BigInt(id), [id]);

  const navigate = useNavigate();
  const getWorkflow = useGetWorkflow(workflowId);
  const updateWorkflow = useUpdateWorkflow(workflowId);
  const duplicateWorkflow = useDuplicateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const toggleFavorite = useToggleFavorite();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const workflow = Array.isArray(getWorkflow.data)
    ? null
    : (getWorkflow.data ?? null);

  // Local form state — seeded once the workflow loads, then edited freely.
  // We track a "loaded" guard so re-seeding doesn't clobber in-progress edits
  // when the cache refetches.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [planText, setPlanText] = useState("");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (workflow && !seeded) {
      setName(workflow.name);
      setDescription(workflow.description);
      setTagsText(tagsToText(workflow.tags));
      setPlanText(workflow.planText);
      setSeeded(true);
    }
  }, [workflow, seeded]);

  const isDirty = useMemo(() => {
    if (!workflow) return false;
    return (
      name !== workflow.name ||
      description !== workflow.description ||
      tagsToText(parseTags(tagsText)) !== tagsToText(workflow.tags) ||
      planText !== workflow.planText
    );
  }, [workflow, name, description, tagsText, planText]);

  const handleSave = () => {
    if (!workflow) return;
    const update: Workflow = {
      ...workflow,
      name: name.trim() || workflow.name,
      description,
      tags: parseTags(tagsText),
      planText,
      updatedAt: BigInt(Date.now()),
    };
    updateWorkflow.mutate(update, {
      onSuccess: (saved) => {
        if (!saved) {
          toast.error("Save failed — workflow not found.");
          return;
        }
        toast.success("Workflow saved.");
        setSeeded(false);
      },
      onError: () => toast.error("Could not save changes."),
    });
  };

  const handleDuplicate = () => {
    duplicateWorkflow.mutate(workflowId, {
      onSuccess: (dup) => {
        if (!dup) {
          toast.error("Could not duplicate this workflow.");
          return;
        }
        toast.success("Workflow duplicated.");
        void navigate({ to: "/workflows/$id", params: { id: String(dup.id) } });
      },
      onError: () => toast.error("Duplication failed."),
    });
  };

  const handleDelete = () => {
    deleteWorkflow.mutate(workflowId, {
      onSuccess: () => {
        setDeleteOpen(false);
        toast.success("Workflow deleted.");
        void navigate({ to: "/workflows" });
      },
      onError: () => toast.error("Could not delete workflow."),
    });
  };

  const handleFavorite = () => {
    toggleFavorite.mutate(workflowId, {
      onError: () => toast.error("Could not update favorite."),
    });
  };

  const saving = updateWorkflow.isPending;
  const busy =
    saving ||
    duplicateWorkflow.isPending ||
    deleteWorkflow.isPending ||
    toggleFavorite.isPending;

  // Loading state
  if (getWorkflow.isLoading) {
    return (
      <section className="space-y-6" data-ocid="workflow_edit.loading_state">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </section>
    );
  }

  // Not found
  if (!workflow) {
    return (
      <section
        className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/50 px-6 py-20 text-center"
        data-ocid="workflow_edit.not_found"
      >
        <p className="font-display text-base font-medium text-foreground">
          Workflow not found
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          This workflow may have been deleted, or the link is incorrect.
        </p>
        <Button
          variant="outline"
          size="sm"
          data-ocid="workflow_edit.back_button"
          onClick={() => void navigate({ to: "/workflows" })}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to workflows
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6" data-ocid="workflow_edit.page">
      {/* Top bar: back, title, actions */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            data-ocid="workflow_edit.back_button"
            aria-label="Back to workflows"
            onClick={() => void navigate({ to: "/workflows" })}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
          <div className="min-w-0 space-y-0.5">
            <h1
              className="truncate font-display text-xl font-semibold tracking-tight text-foreground"
              data-ocid="workflow_edit.title"
            >
              {workflow.name || "Untitled workflow"}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/60">
              editing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            data-ocid="workflow_edit.favorite_button"
            aria-label={
              workflow.favorite ? "Unfavorite workflow" : "Favorite workflow"
            }
            aria-pressed={workflow.favorite}
            onClick={handleFavorite}
            disabled={busy}
            className="h-9 w-9"
          >
            <Star
              className={
                workflow.favorite
                  ? "h-4 w-4 fill-primary text-primary"
                  : "h-4 w-4 text-muted-foreground"
              }
              aria-hidden
            />
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-ocid="workflow_edit.duplicate_button"
            onClick={handleDuplicate}
            disabled={busy}
          >
            <Copy className="h-4 w-4" aria-hidden />
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-ocid="workflow_edit.delete_button"
            onClick={() => setDeleteOpen(true)}
            disabled={busy}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete
          </Button>
          <Button
            size="sm"
            data-ocid="workflow_edit.save_button"
            onClick={handleSave}
            disabled={busy || !isDirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : isDirty ? (
              <Save className="h-4 w-4" aria-hidden />
            ) : (
              <Check className="h-4 w-4" aria-hidden />
            )}
            {saving ? "Saving…" : isDirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </header>

      <Separator />

      {/* Edit form */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="workflow-name" data-ocid="workflow_edit.name_label">
            Name
          </Label>
          <Input
            id="workflow-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow name"
            data-ocid="workflow_edit.name_input"
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="workflow-description"
            data-ocid="workflow_edit.description_label"
          >
            Description
          </Label>
          <Textarea
            id="workflow-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this workflow do?"
            data-ocid="workflow_edit.description_input"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow-tags" data-ocid="workflow_edit.tags_label">
            Tags
          </Label>
          <Input
            id="workflow-tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="comma, separated, tags"
            data-ocid="workflow_edit.tags_input"
          />
          <p className="font-mono text-[11px] text-muted-foreground/60">
            Separate tags with commas. Leave empty for none.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="workflow-plan" data-ocid="workflow_edit.plan_label">
            Plan
          </Label>
          <Textarea
            id="workflow-plan"
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
            placeholder="The step-by-step plan this workflow runs."
            data-ocid="workflow_edit.plan_input"
            rows={16}
            className="font-mono text-xs leading-relaxed scrollbar-thin"
          />
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent data-ocid="workflow_edit.delete_dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{workflow.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the workflow and its plan. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="workflow_edit.delete_cancel"
              disabled={deleteWorkflow.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="workflow_edit.delete_confirm"
              onClick={handleDelete}
              disabled={deleteWorkflow.isPending}
            >
              {deleteWorkflow.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Deleting…
                </>
              ) : (
                "Delete workflow"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
