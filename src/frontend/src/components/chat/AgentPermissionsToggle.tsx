import { ShieldAlert, ShieldCheck } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type AgentPermissionsToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Prefix for data-ocid attributes (e.g. "plan_display" or "workflow_edit"). */
  ocidPrefix?: string;
  className?: string;
  /** Compact layout for tight toolbars. */
  compact?: boolean;
};

/**
 * Pre-confirmation toggle: when on, Copy for MCP embeds full read/write/execute
 * grant language so the external AI agent can run without per-step confirmation.
 * Preference is browser-local (see useAgentPermissions) — zero canister cycles.
 */
export function AgentPermissionsToggle({
  checked,
  onCheckedChange,
  ocidPrefix = "agent_permissions",
  className,
  compact = false,
}: AgentPermissionsToggleProps) {
  const switchId = `${ocidPrefix}.grant_all_switch`;

  return (
    <div
      data-ocid={`${ocidPrefix}.grant_all_row`}
      className={cn(
        "rounded-lg border border-border bg-secondary/30",
        compact ? "p-2.5" : "p-3",
        checked ? "border-primary/30 bg-primary/5" : "border-border",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            checked
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {checked ? (
            <ShieldCheck className="h-3.5 w-3.5" />
          ) : (
            <ShieldAlert className="h-3.5 w-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor={switchId}
              data-ocid={`${ocidPrefix}.grant_all_label`}
              className="cursor-pointer text-sm font-medium leading-snug text-foreground"
            >
              Grant all read / write / execute
            </Label>
            <Switch
              id={switchId}
              data-ocid={switchId}
              checked={checked}
              onCheckedChange={onCheckedChange}
              aria-describedby={`${ocidPrefix}.grant_all_help`}
            />
          </div>
          <p
            id={`${ocidPrefix}.grant_all_help`}
            data-ocid={`${ocidPrefix}.grant_all_help`}
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {checked ? (
              <>
                <strong className="text-foreground">Pre-confirmed.</strong> Copy
                for MCP will tell the agent it may use read, write, and execute
                tools for this workflow without waiting for per-step approval.
                Personal rules in the plan still apply.
              </>
            ) : (
              <>
                <strong className="text-foreground">Confirm writes.</strong>{" "}
                Copy for MCP tells the agent to prefer read-only tools and ask
                before any write or delete. Safer default.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
