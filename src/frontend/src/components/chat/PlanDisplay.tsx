import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Save,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GROK_CHAT_URL, planClipboardPayload } from "@/lib/mcp";
import { cn } from "@/lib/utils";

// PlanDisplay: numbered plan + Run now (in-app reads) + Copy for MCP + Save.

type PlanDisplayProps = {
  planText: string;
  onSave: () => void;
  onRetry: () => void;
  onRun?: () => void | Promise<void>;
  isSaving?: boolean;
  isRunning?: boolean;
  canRetry?: boolean;
  className?: string;
};

export function PlanDisplay({
  planText,
  onSave,
  onRetry,
  onRun,
  isSaving = false,
  isRunning = false,
  canRetry = false,
  className,
}: PlanDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(planClipboardPayload(planText));
      setCopied(true);
      toast.success(
        "Plan copied — paste into Grok with the IC MCP connector enabled",
      );
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard unavailable — select the plan text manually");
    }
  };

  const handleOpenGrok = async () => {
    try {
      await navigator.clipboard.writeText(planClipboardPayload(planText));
      toast.success(
        "Plan copied — paste it into the Grok chat that just opened",
      );
    } catch {
      // still open Grok
    }
    window.open(GROK_CHAT_URL, "_blank", "noopener,noreferrer");
  };

  // Prefer lines that look like steps; still show full text for template headers.
  const lines = planText.split("\n").filter((line) => line.trim().length > 0);
  const stepLines = lines.filter((line) => /^\s*\d+[\.)]\s/.test(line));
  const displayLines = stepLines.length > 0 ? stepLines : lines;

  return (
    <div
      data-ocid="plan_display"
      className={cn(
        "rounded-xl border border-border bg-card/60 p-4 shadow-subtle",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="border-primary/20 bg-primary/10 text-primary"
            data-ocid="plan_display.badge"
          >
            Plan
          </Badge>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
            {displayLines.length} {displayLines.length === 1 ? "step" : "steps"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {canRetry && (
            <Button
              variant="ghost"
              size="sm"
              data-ocid="plan_display.retry_button"
              aria-label="Regenerate plan"
              onClick={onRetry}
              disabled={isRunning}
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
            aria-label="Copy plan for MCP"
            onClick={() => void handleCopy()}
            disabled={isRunning}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">
              {copied ? "Copied" : "Copy for MCP"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-ocid="plan_display.grok_button"
            aria-label="Open Grok to run with MCP"
            onClick={() => void handleOpenGrok()}
            disabled={isRunning}
            className="h-8"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Open Grok</span>
          </Button>
          {onRun ? (
            <Button
              variant="default"
              size="sm"
              data-ocid="plan_display.run_button"
              aria-label="Run plan in this app"
              onClick={() => void onRun()}
              disabled={isRunning || isSaving}
              className="h-8"
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="hidden sm:inline">
                {isRunning ? "Running…" : "Run now"}
              </span>
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            data-ocid="plan_display.save_button"
            aria-label="Save plan as workflow"
            onClick={onSave}
            disabled={isSaving || isRunning}
            className="h-8"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">
              {isSaving ? "Saving…" : "Save"}
            </span>
          </Button>
        </div>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Run now</strong> executes read-only
        IC queries in this browser (e.g. ICP balance for your CrossApp
        principal). Full cross-app MCP actions need{" "}
        <strong className="text-foreground">Copy for MCP → Grok</strong> with
        the connector connected.
      </p>

      <ol className="space-y-2.5" data-ocid="plan_display.steps">
        {displayLines.map((line, index) => (
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
