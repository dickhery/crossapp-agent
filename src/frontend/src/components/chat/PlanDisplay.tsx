import { Check, Copy, RefreshCw, Save } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// PlanDisplay renders the assistant's numbered plan with two affordances:
// "Copy Plan" (clipboard) and "Save as Workflow" (persist to backend). The
// plan text is expected to already be a numbered, structured plan from the
// backend's PlanResult.planText field. We render it with monospace numerals
// and preserve line breaks so the structure reads cleanly.

type PlanDisplayProps = {
  planText: string;
  onSave: () => void;
  onRetry: () => void;
  isSaving?: boolean;
  canRetry?: boolean;
  className?: string;
};

export function PlanDisplay({
  planText,
  onSave,
  onRetry,
  isSaving = false,
  canRetry = false,
  className,
}: PlanDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(planText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable (permissions, insecure context). Fail
      // silently — the plan text remains visible for manual selection.
    }
  };

  // Split the plan into lines and render numbered steps with a hanging indent
  // so wrapped lines align under the text, not the numeral.
  const lines = planText.split("\n").filter((line) => line.trim().length > 0);

  return (
    <div
      data-ocid="plan_display"
      className={cn(
        "rounded-xl border border-border bg-card/60 p-4 shadow-subtle",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="border-primary/20 bg-primary/10 text-primary"
            data-ocid="plan_display.badge"
          >
            Plan
          </Badge>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
            {lines.length} {lines.length === 1 ? "step" : "steps"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {canRetry && (
            <Button
              variant="ghost"
              size="sm"
              data-ocid="plan_display.retry_button"
              aria-label="Regenerate plan"
              onClick={onRetry}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Retry</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            data-ocid="plan_display.copy_button"
            aria-label="Copy plan to clipboard"
            onClick={handleCopy}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied" : "Copy Plan"}
            </span>
          </Button>
          <Button
            variant="default"
            size="sm"
            data-ocid="plan_display.save_button"
            aria-label="Save plan as workflow"
            onClick={onSave}
            disabled={isSaving}
            className="h-8"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">
              {isSaving ? "Saving…" : "Save as Workflow"}
            </span>
          </Button>
        </div>
      </div>

      <ol className="space-y-2.5" data-ocid="plan_display.steps">
        {lines.map((line, index) => (
          <li
            // biome-ignore lint/suspicious/noArrayIndexKey: static plan step list
            key={index}
            data-ocid={`plan_display.step.${index + 1}`}
            className="flex gap-3 text-sm leading-relaxed text-foreground"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] font-semibold text-primary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
              {line.replace(/^\s*(\d+[\.)]\s*)?/, "").trim() || line}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
