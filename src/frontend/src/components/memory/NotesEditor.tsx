import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSetNotes } from "@/hooks/use-preferences";

type NotesEditorProps = {
  notes: string;
};

export function NotesEditor({ notes }: NotesEditorProps) {
  const setNotes = useSetNotes();

  // Local draft so typing is instant; we sync from server when it changes
  // externally (e.g. after a successful save round-trip) but never clobber
  // in-progress edits.
  const [draft, setDraft] = useState(notes);
  const [saved, setSaved] = useState(false);
  const lastServerNotes = useRef(notes);

  useEffect(() => {
    if (notes !== lastServerNotes.current) {
      lastServerNotes.current = notes;
      // Only adopt server value if the user isn't mid-edit on the same content.
      setDraft((current) => (current === notes ? current : notes));
    }
  }, [notes]);

  const isDirty = draft !== notes;

  const handleSave = () => {
    if (!isDirty || setNotes.isPending) return;
    setNotes.mutate(draft, {
      onSuccess: () => {
        lastServerNotes.current = draft;
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      },
    });
  };

  const handleReset = () => {
    setDraft(notes);
  };

  return (
    <section
      data-ocid="memory.notes.section"
      className="space-y-4"
      aria-labelledby="notes-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2
            id="notes-heading"
            className="font-display text-lg font-semibold tracking-tight text-foreground"
          >
            Persistent notes
          </h2>
          <p className="text-sm text-muted-foreground">
            Context the agent should always remember when working on your
            behalf.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Textarea
          data-ocid="memory.notes.textarea"
          aria-labelledby="notes-heading"
          placeholder="e.g. I prefer concise plans. My primary wallet is the one ending in abc. Always confirm before calling the ledger canister."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={setNotes.isPending}
          className="min-h-40 font-body leading-relaxed"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            {setNotes.isError ? (
              <p
                data-ocid="memory.notes.error_state"
                role="alert"
                className="text-destructive"
              >
                {setNotes.error instanceof Error
                  ? setNotes.error.message
                  : "Failed to save notes"}
              </p>
            ) : saved ? (
              <p
                data-ocid="memory.notes.success_state"
                className="flex items-center gap-1.5 text-success"
              >
                <Check className="h-4 w-4" aria-hidden />
                Notes saved
              </p>
            ) : isDirty ? (
              <p className="text-muted-foreground">Unsaved changes</p>
            ) : (
              <p className="text-muted-foreground/70">All changes saved</p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-ocid="memory.notes.discard_button"
              onClick={handleReset}
              disabled={!isDirty || setNotes.isPending}
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              data-ocid="memory.notes.save_button"
              onClick={handleSave}
              disabled={!isDirty || setNotes.isPending}
            >
              {setNotes.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
              Save notes
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
