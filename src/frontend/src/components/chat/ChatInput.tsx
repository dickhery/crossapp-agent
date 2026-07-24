import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ChatInput is the sticky bottom composer. It auto-resizes the textarea up to
// a max height, submits on Enter (Shift+Enter inserts a newline), and disables
// itself while a request is in flight. The submit button is icon-first so it
// stays compact on mobile.

type ChatInputProps = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  isPending?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

export function ChatInput({
  onSubmit,
  disabled = false,
  isPending = false,
  placeholder = "Describe a goal and I'll draft a numbered plan…",
  autoFocus = true,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to a cap, then scroll internally.
  // biome-ignore lint/correctness/useExhaustiveDependencies: height depends on rendered content, not the value variable itself
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const canSubmit = value.trim().length > 0 && !disabled && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      data-ocid="chat.input"
      className={cn(
        "rounded-xl border border-border bg-card p-2 shadow-subtle transition-colors",
        "focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20",
      )}
    >
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          data-ocid="chat.input.textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Describe your goal"
          rows={1}
          className={cn(
            "min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
            "scrollbar-thin",
          )}
        />
        <Button
          type="button"
          size="icon"
          data-ocid="chat.input.submit_button"
          aria-label="Send message"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mb-0.5 h-9 w-9 shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>
      <p className="px-2 pb-1 pt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
