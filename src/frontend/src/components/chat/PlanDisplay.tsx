import { Check, Copy, ExternalLink, RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AgentPermissionsToggle } from "@/components/chat/AgentPermissionsToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgentPermissions } from "@/hooks/use-agent-permissions";
import { useConnectorDisplayName } from "@/hooks/use-connector-name";
import {
  GROK_CHAT_URL,
  GROK_CONNECTORS_URL,
  planClipboardPayload,
} from "@/lib/mcp";
import { cn } from "@/lib/utils";

// PlanDisplay: numbered MCP-ready plan with copy / open Grok / save workflow.

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
  const { connectorName } = useConnectorDisplayName();
  const { grantAllPermissions, setGrantAllPermissions } = useAgentPermissions();

  const buildPayload = () =>
    planClipboardPayload(planText, {
      connectorDisplayName: connectorName,
      grantAllPermissions,
    });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPayload());
      setCopied(true);
      toast.success(
        grantAllPermissions
          ? `Workflow copied with full permissions — paste into Grok/Claude with "${connectorName}" enabled`
          : `Workflow copied — paste into Grok/Claude with "${connectorName}" enabled`,
      );
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard unavailable — select the plan text manually");
    }
  };

  const handleOpenGrok = async () => {
    try {
      await navigator.clipboard.writeText(buildPayload());
      toast.success(
        grantAllPermissions
          ? `Copied with full permissions for "${connectorName}". Paste into Grok after the tab opens.`
          : `Copied for "${connectorName}". Paste into Grok after the tab opens.`,
      );
    } catch {
      // still open Grok
    }
    window.open(GROK_CHAT_URL, "_blank", "noopener,noreferrer");
  };

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
            Workflow plan
          </Badge>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground/70">
            {displayLines.length} {displayLines.length === 1 ? "step" : "steps"}
          </span>
          {grantAllPermissions && (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary"
              data-ocid="plan_display.permissions_badge"
            >
              Full permissions
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
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
            variant="default"
            size="sm"
            data-ocid="plan_display.copy_button"
            aria-label="Copy workflow for MCP"
            onClick={() => void handleCopy()}
            className="h-8"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
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
            aria-label="Open Grok to paste the workflow"
            onClick={() => void handleOpenGrok()}
            className="h-8"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Open Grok</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            data-ocid="plan_display.save_button"
            aria-label="Save plan as workflow"
            onClick={onSave}
            disabled={isSaving}
            className="h-8"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">
              {isSaving ? "Saving…" : "Save workflow"}
            </span>
          </Button>
        </div>
      </div>

      <AgentPermissionsToggle
        checked={grantAllPermissions}
        onCheckedChange={setGrantAllPermissions}
        ocidPrefix="plan_display"
        className="mb-4"
      />

      <div
        data-ocid="plan_display.howto"
        className="mb-4 space-y-2 rounded-lg border border-border bg-secondary/30 p-3 text-xs leading-relaxed text-muted-foreground"
      >
        <p className="font-medium text-foreground">
          How to run this with your AI agent
        </p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>
            Finish <strong className="text-foreground">Setup</strong> once:
            trust the IC MCP URL in Internet Identity, add it in{" "}
            <a
              href={GROK_CONNECTORS_URL}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Grok connectors
            </a>{" "}
            (or Claude), and save your connector display name if it differs from
            the default (yours:{" "}
            <strong className="text-foreground">
              &quot;{connectorName}&quot;
            </strong>
            ).
          </li>
          <li>
            Optionally enable{" "}
            <strong className="text-foreground">
              Grant all read / write / execute
            </strong>{" "}
            above if you want the agent to run without waiting for per-step
            confirmation (still bound by your Memory rules).
          </li>
          <li>
            Press <strong className="text-foreground">Copy for MCP</strong> —
            the paste text tells the agent to use{" "}
            <strong className="text-foreground">
              &quot;{connectorName}&quot;
            </strong>
            {grantAllPermissions
              ? " and that full permissions are pre-confirmed."
              : "."}
          </li>
          <li>
            Open a chat with{" "}
            <strong className="text-foreground">{connectorName}</strong> enabled
            for that conversation.
          </li>
          <li>
            Paste and send. The agent uses MCP tools under your Internet
            Identity grant.
          </li>
          <li>
            Optional: <strong className="text-foreground">Save workflow</strong>{" "}
            to reuse later from Workflows.
          </li>
        </ol>
      </div>

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
