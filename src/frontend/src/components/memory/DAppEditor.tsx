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
import { Textarea } from "@/components/ui/textarea";
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
  /** One canister principal per line (or comma-separated). */
  canisterIdsText: string;
  /** One agent account ID per line (or comma-separated). */
  accountIdsText: string;
};

const EMPTY_DRAFT: Draft = {
  friendlyName: "",
  canisterIdsText: "",
  accountIdsText: "",
};

/** Soft caps match backend (core.mo) so we fail client-side first. */
const MAX_CANISTERS_PER_DAPP = 12;
const MAX_ACCOUNTS_PER_DAPP = 12;
const MAX_ID_CHARS = 200;

/**
 * Split a multi-line / comma-separated ID field into trimmed unique strings.
 */
function parseIdList(raw: string, maxCount: number): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= MAX_ID_CHARS);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= maxCount) break;
  }
  return out;
}

function idsToText(ids: string[]): string {
  return ids.join("\n");
}

function isDraftValid(draft: Draft): boolean {
  return (
    draft.friendlyName.trim().length > 0 &&
    parseIdList(draft.canisterIdsText, MAX_CANISTERS_PER_DAPP).length > 0
  );
}

function dAppFromDraft(
  id: bigint,
  draft: Draft,
): Omit<PreferredDApp, "id"> & { id: bigint } {
  return {
    id,
    friendlyName: draft.friendlyName.trim(),
    canisterIds: parseIdList(draft.canisterIdsText, MAX_CANISTERS_PER_DAPP),
    accountIds: parseIdList(draft.accountIdsText, MAX_ACCOUNTS_PER_DAPP),
  };
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
    const payload = dAppFromDraft(0n, addDraft);
    addDApp.mutate(
      {
        friendlyName: payload.friendlyName,
        canisterIds: payload.canisterIds,
        accountIds: payload.accountIds,
      },
      {
        onSuccess: () => setAddDraft(EMPTY_DRAFT),
        onError: (e) =>
          setError(e instanceof Error ? e.message : "Failed to add dApp"),
      },
    );
  };

  const startEdit = (dApp: PreferredDApp) => {
    setEditingId(dApp.id);
    setEditDraft({
      friendlyName: dApp.friendlyName,
      canisterIdsText: idsToText(dApp.canisterIds ?? []),
      accountIdsText: idsToText(dApp.accountIds ?? []),
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
    updateDApp.mutate(dAppFromDraft(dApp.id, editDraft), {
      onSuccess: () => cancelEdit(),
      onError: (e) =>
        setError(e instanceof Error ? e.message : "Failed to update dApp"),
    });
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
            Apps the agent can control
          </h2>
          <p className="text-sm text-muted-foreground">
            Bundle each dApp with its canister principals and the account IDs
            your agent&apos;s Internet Identity uses inside that app. Plans and
            Copy for MCP will tell the agent to use these exact account IDs for
            deposits and transfers — reducing the risk of sending funds to the
            wrong destination.
          </p>
        </div>
      </div>

      {/* Add form */}
      <div
        data-ocid="memory.dapps.add_form"
        className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="dapp-name" className="text-xs text-muted-foreground">
            App name
          </Label>
          <Input
            id="dapp-name"
            data-ocid="memory.dapps.name_input"
            placeholder="e.g. NNS, OpenChat, My NFT Vault"
            value={addDraft.friendlyName}
            onChange={(e) =>
              setAddDraft((d) => ({ ...d, friendlyName: e.target.value }))
            }
            disabled={isAddBusy}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="dapp-canisters"
              className="text-xs text-muted-foreground"
            >
              Canister IDs{" "}
              <span className="text-muted-foreground/70">
                (one per line, required)
              </span>
            </Label>
            <Textarea
              id="dapp-canisters"
              data-ocid="memory.dapps.canister_input"
              placeholder={
                "e.g.\nryjl3-tyaaa-aaaaa-aaaba-cai\nrrkah-fqaaa-aaaaa-aaaaq-cai"
              }
              value={addDraft.canisterIdsText}
              onChange={(e) =>
                setAddDraft((d) => ({
                  ...d,
                  canisterIdsText: e.target.value,
                }))
              }
              disabled={isAddBusy}
              rows={3}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
          <div className="space-y-1.5">
            <Label
              htmlFor="dapp-accounts"
              className="text-xs text-muted-foreground"
            >
              Agent account IDs{" "}
              <span className="text-muted-foreground/70">
                (optional, recommended)
              </span>
            </Label>
            <Textarea
              id="dapp-accounts"
              data-ocid="memory.dapps.account_input"
              placeholder={
                "Account IDs for this agent II inside the app\n(e.g. ICRC account, account identifier, principal)"
              }
              value={addDraft.accountIdsText}
              onChange={(e) =>
                setAddDraft((d) => ({
                  ...d,
                  accountIdsText: e.target.value,
                }))
              }
              disabled={isAddBusy}
              rows={3}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground/70">
          Up to {MAX_CANISTERS_PER_DAPP} canisters and {MAX_ACCOUNTS_PER_DAPP}{" "}
          account IDs per app. Get agent accounts via MCP (
          <code className="rounded bg-muted px-1">get_app_principal</code>,{" "}
          <code className="rounded bg-muted px-1">list_app_accounts</code>) or
          the app&apos;s own UI.
        </p>
        <div className="flex justify-end">
          <Button
            type="button"
            data-ocid="memory.dapps.add_button"
            onClick={handleAdd}
            disabled={!isDraftValid(addDraft) || isAddBusy}
          >
            {isAddBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
            Add app
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
            No apps registered yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a friendly name, one or more canister IDs, and ideally the
            agent&apos;s account IDs for that app so plans never guess where to
            send funds.
          </p>
        </div>
      ) : (
        <ul
          data-ocid="memory.dapps.list"
          className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
        >
          {dApps.map((dApp, index) => {
            const isEditing = editingId === dApp.id;
            const canisters = dApp.canisterIds ?? [];
            const accounts = dApp.accountIds ?? [];
            return (
              <li
                key={dApp.id.toString()}
                data-ocid={`memory.dapps.item.${index}`}
                className="flex flex-col gap-3 p-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Canister IDs
                        </Label>
                        <Textarea
                          data-ocid={`memory.dapps.edit_canister_input.${index}`}
                          aria-label="Edit canister IDs"
                          value={editDraft.canisterIdsText}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              canisterIdsText: e.target.value,
                            }))
                          }
                          disabled={isEditBusy}
                          rows={3}
                          className="font-mono text-xs leading-relaxed"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Agent account IDs
                        </Label>
                        <Textarea
                          data-ocid={`memory.dapps.edit_account_input.${index}`}
                          aria-label="Edit account IDs"
                          value={editDraft.accountIdsText}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              accountIdsText: e.target.value,
                            }))
                          }
                          disabled={isEditBusy}
                          rows={3}
                          className="font-mono text-xs leading-relaxed"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <p className="truncate font-medium text-foreground">
                        {dApp.friendlyName}
                      </p>
                      <div className="space-y-1">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                          Canisters
                        </p>
                        {canisters.length > 0 ? (
                          <ul className="space-y-0.5">
                            {canisters.map((id) => (
                              <li
                                key={id}
                                className="truncate font-mono text-xs text-muted-foreground"
                              >
                                {id}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs italic text-muted-foreground/70">
                            None
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
                          Agent account IDs
                        </p>
                        {accounts.length > 0 ? (
                          <ul className="space-y-0.5">
                            {accounts.map((id) => (
                              <li
                                key={id}
                                className="truncate font-mono text-xs text-primary/90"
                              >
                                {id}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs italic text-amber-500/90">
                            Not set — agent may guess the wrong account for
                            transfers
                          </p>
                        )}
                      </div>
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
                  </div>
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
                ? `"${pendingDelete.friendlyName}" and its canister/account IDs will be removed from your preferences. This cannot be undone.`
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
