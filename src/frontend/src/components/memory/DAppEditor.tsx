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
import { Label } from "@/components/ui/label";
import {
  useAddDApp,
  useDeleteDApp,
  useUpdateDApp,
} from "@/hooks/use-preferences";
import { cn } from "@/lib/utils";
import type { PreferredDApp } from "@/types";

type DAppEditorProps = {
  dApps: PreferredDApp[];
};

type Draft = {
  friendlyName: string;
  canisterId: string;
};

const EMPTY_DRAFT: Draft = { friendlyName: "", canisterId: "" };

function isDraftValid(draft: Draft): boolean {
  return (
    draft.friendlyName.trim().length > 0 && draft.canisterId.trim().length > 0
  );
}

export function DAppEditor({ dApps }: DAppEditorProps) {
  const addDApp = useAddDApp();
  const updateDApp = useUpdateDApp();
  const deleteDApp = useDeleteDApp();

  const [addDraft, setAddDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<bigint | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT);
  const [pendingDelete, setPendingDelete] = useState<PreferredDApp | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!isDraftValid(addDraft)) return;
    setError(null);
    addDApp.mutate([addDraft.friendlyName.trim(), addDraft.canisterId.trim()], {
      onSuccess: () => setAddDraft(EMPTY_DRAFT),
      onError: (e) =>
        setError(e instanceof Error ? e.message : "Failed to add dApp"),
    });
  };

  const startEdit = (dApp: PreferredDApp) => {
    setEditingId(dApp.id);
    setEditDraft({
      friendlyName: dApp.friendlyName,
      canisterId: dApp.canisterId,
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const saveEdit = (dApp: PreferredDApp) => {
    if (!isDraftValid(editDraft)) return;
    setError(null);
    updateDApp.mutate(
      {
        id: dApp.id,
        friendlyName: editDraft.friendlyName.trim(),
        canisterId: editDraft.canisterId.trim(),
      },
      {
        onSuccess: () => cancelEdit(),
        onError: (e) =>
          setError(e instanceof Error ? e.message : "Failed to update dApp"),
      },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setError(null);
    deleteDApp.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
      onError: (e) => {
        setError(e instanceof Error ? e.message : "Failed to delete dApp");
        setPendingDelete(null);
      },
    });
  };

  const isAddBusy = addDApp.isPending;
  const isEditBusy = updateDApp.isPending;
  const isDeleteBusy = deleteDApp.isPending;

  return (
    <section
      data-ocid="memory.dapps.section"
      className="space-y-4"
      aria-labelledby="dapps-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2
            id="dapps-heading"
            className="font-display text-lg font-semibold tracking-tight text-foreground"
          >
            Preferred dApps
          </h2>
          <p className="text-sm text-muted-foreground">
            Pin the canister IDs you reference most often with friendly names.
          </p>
        </div>
      </div>

      {/* Add form */}
      <div
        data-ocid="memory.dapps.add_form"
        className="rounded-lg border border-border bg-secondary/40 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label
              htmlFor="dapp-name"
              className="text-xs text-muted-foreground"
            >
              Friendly name
            </Label>
            <Input
              id="dapp-name"
              data-ocid="memory.dapps.name_input"
              placeholder="e.g. Ledger"
              value={addDraft.friendlyName}
              onChange={(e) =>
                setAddDraft((d) => ({ ...d, friendlyName: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              disabled={isAddBusy}
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="dapp-canister"
              className="text-xs text-muted-foreground"
            >
              Canister ID
            </Label>
            <Input
              id="dapp-canister"
              data-ocid="memory.dapps.canister_input"
              placeholder="e.g. ryjl3-tyaaa-aaaaa-aaaba-cai"
              value={addDraft.canisterId}
              onChange={(e) =>
                setAddDraft((d) => ({ ...d, canisterId: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              disabled={isAddBusy}
              className="font-mono text-xs"
            />
          </div>
          <Button
            type="button"
            data-ocid="memory.dapps.add_button"
            onClick={handleAdd}
            disabled={!isDraftValid(addDraft) || isAddBusy}
            className="sm:mb-0"
          >
            {isAddBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
            Add
          </Button>
        </div>
      </div>

      {error && (
        <p
          data-ocid="memory.dapps.error_state"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* List */}
      {dApps.length === 0 ? (
        <div
          data-ocid="memory.dapps.empty_state"
          className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-10 text-center"
        >
          <p className="font-display text-sm font-medium text-foreground">
            No preferred dApps yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first canister above to keep it one click away.
          </p>
        </div>
      ) : (
        <ul
          data-ocid="memory.dapps.list"
          className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
        >
          {dApps.map((dApp, index) => {
            const isEditing = editingId === dApp.id;
            return (
              <li
                key={dApp.id.toString()}
                data-ocid={`memory.dapps.item.${index}`}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                {isEditing ? (
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <Input
                      data-ocid={`memory.dapps.edit_name_input.${index}`}
                      aria-label="Edit friendly name"
                      value={editDraft.friendlyName}
                      onChange={(e) =>
                        setEditDraft((d) => ({
                          ...d,
                          friendlyName: e.target.value,
                        }))
                      }
                      disabled={isEditBusy}
                      autoFocus
                    />
                    <Input
                      data-ocid={`memory.dapps.edit_canister_input.${index}`}
                      aria-label="Edit canister ID"
                      value={editDraft.canisterId}
                      onChange={(e) =>
                        setEditDraft((d) => ({
                          ...d,
                          canisterId: e.target.value,
                        }))
                      }
                      disabled={isEditBusy}
                      className="font-mono text-xs"
                    />
                    <div className="flex gap-2 sm:col-span-2 sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-ocid={`memory.dapps.cancel_button.${index}`}
                        onClick={cancelEdit}
                        disabled={isEditBusy}
                      >
                        <X className="h-4 w-4" aria-hidden />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        data-ocid={`memory.dapps.save_button.${index}`}
                        onClick={() => saveEdit(dApp)}
                        disabled={!isDraftValid(editDraft) || isEditBusy}
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
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium text-foreground">
                        {dApp.friendlyName}
                      </p>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {dApp.canisterId}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-ocid={`memory.dapps.edit_button.${index}`}
                        aria-label={`Edit ${dApp.friendlyName}`}
                        onClick={() => startEdit(dApp)}
                        disabled={isEditBusy || isDeleteBusy}
                        className={cn(
                          "h-8 w-8 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        data-ocid={`memory.dapps.delete_button.${index}`}
                        aria-label={`Delete ${dApp.friendlyName}`}
                        onClick={() => setPendingDelete(dApp)}
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
        </ul>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent data-ocid="memory.dapps.delete_modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove preferred dApp?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.friendlyName}" will be removed from your preferences. This cannot be undone.`
                : "This dApp will be removed from your preferences."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="memory.dapps.delete_cancel_button"
              disabled={isDeleteBusy}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="memory.dapps.delete_confirm_button"
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
