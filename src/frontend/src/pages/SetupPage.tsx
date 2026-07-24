import { Link } from "@tanstack/react-router";
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  ListChecks,
  Plug,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  II_TRUSTED_MCP_SETTINGS_URL,
  MCP_CONNECTOR_URL,
  MCP_DOCS_URL,
} from "@/lib/mcp";
import { cn } from "@/lib/utils";

const SETUP_CHECKLIST_KEY = "crossapp.setup.checklist.v1";

type ChecklistState = {
  trustedMcp: boolean;
  connectedAi: boolean;
  authorizedGrant: boolean;
  memorySeeded: boolean;
};

const DEFAULT_CHECKLIST: ChecklistState = {
  trustedMcp: false,
  connectedAi: false,
  authorizedGrant: false,
  memorySeeded: false,
};

function loadChecklist(): ChecklistState {
  try {
    const raw = localStorage.getItem(SETUP_CHECKLIST_KEY);
    if (!raw) return DEFAULT_CHECKLIST;
    return { ...DEFAULT_CHECKLIST, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CHECKLIST;
  }
}

function saveChecklist(state: ChecklistState) {
  try {
    localStorage.setItem(SETUP_CHECKLIST_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode failures — checklist is best-effort UX.
  }
}

export function SetupPage() {
  const [checklist, setChecklist] = useState<ChecklistState>(() =>
    loadChecklist(),
  );
  const [copied, setCopied] = useState(false);

  const toggle = (key: keyof ChecklistState) => {
    setChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveChecklist(next);
      return next;
    });
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_CONNECTOR_URL);
      setCopied(true);
      toast.success("MCP connector URL copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the URL and copy manually");
    }
  };

  const doneCount = Object.values(checklist).filter(Boolean).length;
  const total = Object.keys(DEFAULT_CHECKLIST).length;

  return (
    <section data-ocid="setup.page" className="space-y-8">
      <header className="space-y-2" data-ocid="setup.header">
        <div className="flex items-center gap-2 text-primary">
          <Plug className="h-4 w-4" aria-hidden />
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Onboarding
          </span>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Set up your CrossApp Agent
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          This app stores your plans, dApp memory, and rules on-chain under your
          Internet Identity. Execution happens in Claude or ChatGPT through the
          official Internet Computer MCP server — acting as <em>you</em> on
          every dApp you authorize.
        </p>
      </header>

      {/* Connector URL card */}
      <div
        data-ocid="setup.mcp_url_card"
        className="rounded-xl border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              IC MCP connector URL
            </p>
            <p
              className="break-all font-mono text-sm text-foreground"
              data-ocid="setup.mcp_url_value"
            >
              {MCP_CONNECTOR_URL}
            </p>
            <p className="text-xs text-muted-foreground">
              Beta server docs:{" "}
              <a
                href={MCP_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                mcp.beta.id.ai
              </a>
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            data-ocid="setup.copy_mcp_url_button"
            onClick={() => void copyUrl()}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? "Copied" : "Copy URL"}
          </Button>
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-4" data-ocid="setup.steps">
        <StepCard
          index={1}
          icon={ShieldCheck}
          title="Trust the MCP server in Internet Identity"
          description={
            <>
              Open{" "}
              <a
                href={II_TRUSTED_MCP_SETTINGS_URL}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Internet Identity settings
              </a>
              , sign in with the identity you want the agent to use, and add the
              connector URL under <strong>Trusted MCP servers</strong>.
            </>
          }
          action={
            <Button asChild variant="outline" size="sm">
              <a
                href={II_TRUSTED_MCP_SETTINGS_URL}
                target="_blank"
                rel="noreferrer"
                data-ocid="setup.open_ii_settings"
              >
                Open II settings
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </Button>
          }
        />

        <StepCard
          index={2}
          icon={Link2}
          title="Add the same URL to Claude or ChatGPT"
          description={
            <>
              <strong>Claude:</strong> Settings → Connectors → Add custom
              connector → paste the URL. Allow read-only tools; keep
              write/delete on Ask.
              <br />
              <strong>ChatGPT:</strong> enable Developer mode, then create an
              app/connector and paste the URL.
            </>
          }
        />

        <StepCard
          index={3}
          icon={KeyRound}
          title="Authorize the grant"
          description={
            <>
              Your AI app will send you to Internet Identity. Pick the same
              identity, choose how long the grant lasts, and select{" "}
              <strong>Actions &amp; questions</strong> if you want the agent to
              call methods and manage canisters — or questions-only for
              research. Grants expire by design; re-approving later is normal.
            </>
          }
        />

        <StepCard
          index={4}
          icon={ListChecks}
          title="Seed Memory, then plan in Chat"
          description={
            <>
              Add preferred dApps (friendly name + canister ID), personal rules
              (e.g. “never move more than 20% of my ICP”), and notes. Then open
              Chat, describe a cross-app goal, copy the plan, and paste it into
              Claude/ChatGPT with the MCP connector enabled.
            </>
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/memory" data-ocid="setup.go_memory">
                  Open Memory
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link
                  to="/chat"
                  search={{ historyId: undefined, plan: undefined }}
                  data-ocid="setup.go_chat"
                >
                  Open Chat
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
          }
        />
      </ol>

      {/* Local checklist */}
      <div
        data-ocid="setup.checklist"
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Your progress
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {doneCount}/{total} done
          </span>
        </div>
        <ul className="space-y-2">
          {(
            [
              ["trustedMcp", "Trusted MCP server in Internet Identity"],
              ["connectedAi", "Connected MCP URL in Claude or ChatGPT"],
              ["authorizedGrant", "Authorized an II grant for the MCP server"],
              ["memorySeeded", "Added at least one dApp or rule in Memory"],
            ] as const
          ).map(([key, label]) => (
            <li key={key}>
              <button
                type="button"
                data-ocid={`setup.checklist.${key}`}
                onClick={() => toggle(key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  checklist[key]
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    checklist[key]
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {checklist[key] ? (
                    <Check className="h-3 w-3" aria-hidden />
                  ) : null}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Checklist is stored in this browser only (not on-chain). Revoke MCP
          access anytime in{" "}
          <a
            href={II_TRUSTED_MCP_SETTINGS_URL}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            II settings
          </a>
          .
        </p>
      </div>

      {/* Example goals */}
      <div
        data-ocid="setup.examples"
        className="rounded-xl border border-border bg-card/60 p-5"
      >
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Example goals this agent is built for
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            “Take all my listed NFTs off Marketplace X, move the rare ones into
            my personal vault canister, and list the rest on Marketplace Y with
            15% higher prices.”
          </li>
          <li>
            “Pull my OpenChat history + contacts and mirror the last 30 days of
            posts + follows onto another IC social app.”
          </li>
          <li>
            “Migrate my entire DeFi position from one protocol to another while
            optimizing for gas/cycles.”
          </li>
        </ul>
      </div>
    </section>
  );
}

function StepCard({
  index,
  icon: Icon,
  title,
  description,
  action,
}: {
  index: number;
  icon: typeof ShieldCheck;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <li
      data-ocid={`setup.step.${index}`}
      className="flex gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-semibold text-primary">
        {index}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        </div>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </li>
  );
}

export default SetupPage;
