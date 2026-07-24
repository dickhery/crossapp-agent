import { useNavigate } from "@tanstack/react-router";
import {
  Copy,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Star,
  Trash2,
} from "lucide-react";
import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useDeleteWorkflow,
  useDuplicateWorkflow,
  useExportWorkflowMarkdown,
  useToggleFavorite,
} from "@/hooks/use-workflows";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/types";

// Relative-time formatter — keeps the card metadata terse and human.
const relativeTime = (ms: number): string => {
  const diff = Date.now() - ms;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
};

type WorkflowCardProps = {
  workflow: Workflow;
  index: number;
};

export function WorkflowCard({ workflow, index }: WorkflowCardProps) {
  const navigate = useNavigate();
  const toggleFavorite = useToggleFavorite();
  const duplicateWorkflow = useDuplicateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const exportMarkdown = useExportWorkflowMarkdown();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updatedMs = Number(workflow.updatedAt);

  const handleFavorite = () => {
    toggleFavorite.mutate(workflow.id, {
      onError: () => toast.error("Could not update favorite."),
    });
  };

  const handleUse = () => {
    void navigate({
      to: "/chat",
      search: { historyId: undefined, plan: workflow.planText },
    });
  };

  const handleExport = async () => {
    try {
      const markdown = await exportMarkdown.mutateAsync(workflow.id);
      if (!markdown) {
        toast.error("No markdown returned for this workflow.");
        return;
      }
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflow.name.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "workflow"}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Workflow exported as markdown.");
    } catch {
      toast.error("Export failed. Please try again.");
    }
  };

  const handleDuplicate = () => {
    duplicateWorkflow.mutate(workflow.id, {
      onSuccess: (dup) => {
        if (!dup) {
          toast.error("Could not duplicate this workflow.");
          return;
        }
        toast.success("Workflow duplicated.");
      },
      onError: () => toast.error("Duplication failed."),
    });
  };

  const handleDelete = () => {
    deleteWorkflow.mutate(workflow.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        toast.success("Workflow deleted.");
      },
      onError: () => toast.error("Could not delete workflow."),
    });
  };

  const handleEdit = () => {
    void navigate({
      to: "/workflows/$id",
      params: { id: String(workflow.id) },
    });
  };

  const busy =
    toggleFavorite.isPending ||
    duplicateWorkflow.isPending ||
    deleteWorkflow.isPending ||
    exportMarkdown.isPending;

  return (
    <>
      <Card
        data-ocid={`workflow.card.${index}`}
        className={cn(
          "group relative gap-0 overflow-hidden py-0 transition-smooth",
          "hover:border-primary/40 hover:shadow-md",
          workflow.favorite && "border-primary/30",
        )}
      >
        {/* Favorite accent rail */}
        {workflow.favorite && (
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-1 bg-gradient-accent"
          />
        )}

        <CardHeader className="gap-2 px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={handleEdit}
              data-ocid={`workflow.title.${index}`}
              className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-sm"
            >
              <h3 className="truncate font-display text-base font-semibold tracking-tight text-foreground">
                {workflow.name}
              </h3>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                data-ocid={`workflow.favorite_button.${index}`}
                aria-label={
                  workflow.favorite
                    ? "Unfavorite workflow"
                    : "Favorite workflow"
                }
                aria-pressed={workflow.favorite}
                onClick={handleFavorite}
                disabled={busy}
                className="h-8 w-8"
              >
                <Star
                  className={cn(
                    "h-4 w-4 transition-smooth",
                    workflow.favorite
                      ? "fill-primary text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-hidden
                />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-ocid={`workflow.menu_button.${index}`}
                    aria-label="Workflow actions"
                    disabled={busy}
                    className="h-8 w-8"
                  >
                    <MoreHorizontal className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  data-ocid={`workflow.menu.${index}`}
                >
                  <DropdownMenuItem
                    onSelect={handleEdit}
                    data-ocid={`workflow.edit_action.${index}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={handleDuplicate}
                    data-ocid={`workflow.duplicate_action.${index}`}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={handleExport}
                    data-ocid={`workflow.export_action.${index}`}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    Export markdown
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteOpen(true)}
                    data-ocid={`workflow.delete_action.${index}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {workflow.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {workflow.description}
            </p>
          ) : (
            <p className="line-clamp-2 text-sm italic leading-relaxed text-muted-foreground/60">
              No description
            </p>
          )}
        </CardHeader>

        <CardContent className="px-5 pt-3">
          {workflow.tags.length > 0 ? (
            <div
              className="flex flex-wrap gap-1.5"
              data-ocid={`workflow.tags.${index}`}
            >
              {workflow.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="font-mono text-[10px] uppercase tracking-wide"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
              untagged
            </p>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between gap-3 px-5 pt-4 pb-5">
          <span className="font-mono text-[11px] text-muted-foreground/70">
            updated {relativeTime(updatedMs)}
          </span>
          <Button
            size="sm"
            data-ocid={`workflow.use_button.${index}`}
            onClick={handleUse}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden />
            )}
            Use this
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent data-ocid={`workflow.delete_dialog.${index}`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{workflow.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the workflow and its plan. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid={`workflow.delete_cancel.${index}`}
              disabled={deleteWorkflow.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid={`workflow.delete_confirm.${index}`}
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
    </>
  );
}
