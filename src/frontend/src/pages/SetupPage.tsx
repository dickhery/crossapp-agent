import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  KeyRound,
  ListChecks,
  Plug,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AI_APPS,
  II_TRUSTED_MCP_SETTINGS_URL,
  MCP_CONNECTOR_URL,
  MCP_DOCS_URL,
} from "@/lib/mcp";
import { cn } from "@/lib/utils";

const SETUP_CHECKLIST_KEY = "crossapp.setup.checklist.v2";

type ChecklistState = {
  trustedMcp: boolean;
  connectedAi: boolean;
  authorizedGrant: boolean;
  memorySeeded: boolean;
  smokeTested: boolean;
};

const DEFAULT_CHECKLIST: ChecklistState = {
  trustedMcp: false,
  connectedAi: false,
  authorizedGrant: false,
  memorySeeded: false,
  smokeTested: false,
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
  const [activeApp, setActiveApp] = useState<"grok" | "claude" | "chatgpt">(
    "grok",
  );

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
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          This app is the <strong className="text-foreground">planner</strong>{" "}
          and can <strong className="text-foreground">Run now</strong> for
          read-only IC queries in your browser (e.g. ICP ledger balance for your
          principal here). Full multi-app MCP actions (act as you at NNS and
          other dApps) still need Grok/Claude with the IC MCP connector — remote
          MCP OAuth only allows loopback or DFINITY-allowlisted redirect
          domains, so this hosted SPA cannot complete the MCP login itself.
        </p>
      </header>

      {/* Mental model */}
      <div
        data-ocid="setup.mental_model"
        className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-3"
      >
        <ModelStep
          n="A"
          title="This app"
          body="Sign in with II. Save dApps in Memory. Generate plans and Run now for ledger reads."
        />
        <ModelStep
          n="B"
          title="Internet Identity + MCP trust"
          body="Trust the MCP URL so Grok/Claude can mint app-specific principals for full agent runs."
        />
        <ModelStep
          n="C"
          title="Chat → Run now + Grok MCP"
          body="Run now executes safe ledger reads in-app. Copy for MCP → Grok for full cross-app agent actions."
        />
      </div>

      {/* Connector URL card */}
      <div
        data-ocid="setup.mcp_url_card"
        className="rounded-xl border border-primary/20 bg-primary/5 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Exact MCP connector URL (copy this)
            </p>
            <p
              className="break-all font-mono text-sm text-foreground"
              data-ocid="setup.mcp_url_value"
            >
              {MCP_CONNECTOR_URL}
            </p>
            <p className="text-xs text-muted-foreground">
              Must match character-for-character in II <em>and</em> your AI app.
              Docs:{" "}
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

      {/* Step 1 — II */}
      <ol className="space-y-4" data-ocid="setup.steps">
        <StepCard
          index={1}
          icon={ShieldCheck}
          title="Trust the MCP server in Internet Identity (required first)"
          description={
            <div className="space-y-2">
              <p>
                Without this step, authorization from Grok/Claude/ChatGPT will
                fail or never complete. Do it before adding the connector to an
                AI app.
              </p>
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>
                  Open{" "}
                  <a
                    href={II_TRUSTED_MCP_SETTINGS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    id.ai → Manage → Settings
                  </a>
                  .
                </li>
                <li>
                  Sign in with the <strong>same</strong> Internet Identity you
                  use in this CrossApp Agent app.
                </li>
                <li>
                  Find <strong>Trusted MCP servers</strong> (wording may be
                  “Trusted servers” / “MCP”).
                </li>
                <li>
                  Add:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    {MCP_CONNECTOR_URL}
                  </code>
                </li>
                <li>
                  Save. Leave this tab open if you need to re-check later.
                </li>
              </ol>
            </div>
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

        {/* Step 2 — AI app tabs */}
        <StepCard
          index={2}
          icon={Plug}
          title="Add the same URL to an AI app (pick one)"
          description={
            <div className="space-y-4">
              <p>
                <strong className="text-foreground">Recommended: Grok</strong> —
                personal accounts support custom MCP connectors at a fixed URL,
                with no Business plan required. Claude works well too if you
                know where Customize lives. ChatGPT often needs Developer mode
                and a higher plan.
              </p>

              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Choose AI app"
              >
                {(
                  [
                    ["grok", "Grok (recommended)"],
                    ["claude", "Claude"],
                    ["chatgpt", "ChatGPT"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeApp === id}
                    data-ocid={`setup.ai_tab.${id}`}
                    onClick={() => setActiveApp(id)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                      activeApp === id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeApp === "grok" && <GrokGuide onCopyUrl={copyUrl} />}
              {activeApp === "claude" && <ClaudeGuide onCopyUrl={copyUrl} />}
              {activeApp === "chatgpt" && <ChatGptGuide onCopyUrl={copyUrl} />}
            </div>
          }
        />

        <StepCard
          index={3}
          icon={KeyRound}
          title="Authorize the Internet Identity grant"
          description={
            <div className="space-y-2">
              <p>
                When you first use the connector (or after a grant expires), the
                AI app opens Internet Identity:
              </p>
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>
                  Choose the <strong>same</strong> identity you trusted in step
                  1.
                </li>
                <li>
                  Pick how long the grant lasts (shorter is safer; re-approval
                  is normal).
                </li>
                <li>
                  Choose <strong>Actions &amp; questions</strong> if the agent
                  should call methods and manage canisters, or{" "}
                  <strong>Questions-only</strong> for read-only research.
                </li>
                <li>
                  Confirm. If nothing opens, allow pop-ups for the AI app domain
                  and retry.
                </li>
              </ol>
            </div>
          }
        />

        <StepCard
          index={4}
          icon={ListChecks}
          title="Smoke-test the connector, then use this app"
          description={
            <div className="space-y-2">
              <p>
                In the AI chat (with the connector enabled for that
                conversation), try a cheap read-only prompt first:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <code className="rounded bg-muted px-1 font-mono text-[11px]">
                    What&apos;s my cycles balance?
                  </code>
                </li>
                <li>
                  <code className="rounded bg-muted px-1 font-mono text-[11px]">
                    Look up the ckUSDC ledger
                  </code>
                </li>
                <li>
                  <code className="rounded bg-muted px-1 font-mono text-[11px]">
                    What canisters run multidex.ai?
                  </code>
                </li>
              </ul>
              <p>
                Then seed <strong>Memory</strong> here (dApps + rules), generate
                a plan in <strong>Chat</strong>, hit{" "}
                <strong>Copy for MCP</strong>, and paste into the same AI
                conversation.
              </p>
            </div>
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

      {/* Troubleshooting */}
      <div
        data-ocid="setup.troubleshooting"
        className="rounded-xl border border-border bg-card p-5"
      >
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Troubleshooting
          </h2>
        </div>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <Trouble
            title="I can't find “Connectors” in Claude Settings"
            body={
              <>
                Claude moved this under{" "}
                <strong className="text-foreground">
                  Customize → Connectors
                </strong>
                , not the old Settings sidebar. Open{" "}
                <a
                  href={AI_APPS.claude.connectorsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  claude.ai/customize/connectors
                </a>
                , click <strong>+</strong> next to Connectors, then{" "}
                <strong>Add custom connector</strong>. You can also open
                connectors from a chat: <strong>+</strong> → Connectors → Manage
                connectors.
              </>
            }
          />
          <Trouble
            title="ChatGPT won't let me add an MCP / app"
            body={
              <>
                OpenAI gates custom connectors behind{" "}
                <strong className="text-foreground">Developer mode</strong>{" "}
                (Settings → Advanced) and often{" "}
                <strong className="text-foreground">
                  Business or Enterprise
                </strong>
                . Labels vary: Apps, Connectors, or Plugins. If your plan has no
                way to paste a remote MCP URL, use{" "}
                <strong className="text-foreground">Grok</strong> or{" "}
                <strong className="text-foreground">Claude</strong> instead —
                the IC MCP server is the same.
              </>
            }
          />
          <Trouble
            title="Authorization never finishes / pops up blank"
            body={
              <>
                Confirm step 1 (Trusted MCP servers) used the <em>exact</em> URL
                above. Allow pop-ups for{" "}
                <code className="font-mono text-[11px]">grok.com</code>,{" "}
                <code className="font-mono text-[11px]">claude.ai</code>, or{" "}
                <code className="font-mono text-[11px]">chatgpt.com</code>. Use
                the same II anchor you trusted. Grants expire — re-approve when
                prompted.
              </>
            }
          />
          <Trouble
            title="Connector connects but tools do nothing"
            body={
              <>
                In Claude, enable the connector for the current chat (+ →
                Connectors toggle). Prefer{" "}
                <strong className="text-foreground">
                  read-only tools: Always allow
                </strong>{" "}
                and write tools on Ask. Start with a simple cycles-balance
                question. This CrossApp app only plans — it does not call the
                MCP server itself (keeps canister cycles low).
              </>
            }
          />
        </ul>
      </div>

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
              ["trustedMcp", "Trusted MCP URL in Internet Identity"],
              ["connectedAi", "Connected MCP URL in Grok, Claude, or ChatGPT"],
              ["authorizedGrant", "Authorized an II grant for the MCP server"],
              ["smokeTested", "Smoke-tested with a read-only MCP question"],
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

function ModelStep({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[11px] uppercase tracking-widest text-primary">
        {n}
      </p>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function GrokGuide({ onCopyUrl }: { onCopyUrl: () => void }) {
  return (
    <div
      data-ocid="setup.guide.grok"
      className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
          Recommended
        </Badge>
        <span className="text-sm font-medium text-foreground">
          Grok custom MCP connector
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{AI_APPS.grok.planNote}</p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          Open{" "}
          <a
            href={AI_APPS.grok.connectorsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            grok.com/connectors
          </a>{" "}
          while signed into Grok.
        </li>
        <li>
          Click <strong className="text-foreground">New Connector</strong>, then
          select <strong className="text-foreground">Custom</strong>.
        </li>
        <li>
          Paste the MCP URL{" "}
          <code className="rounded bg-muted px-1 font-mono text-[11px] text-foreground">
            {MCP_CONNECTOR_URL}
          </code>{" "}
          (optional name: “Internet Computer MCP”).
        </li>
        <li>
          Save / connect. When prompted, complete Internet Identity
          authorization (step 3).
        </li>
        <li>
          Start a new Grok chat and ask a smoke-test question (step 4). Grok
          discovers IC MCP tools automatically.
        </li>
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild size="sm" variant="outline">
          <a
            href={AI_APPS.grok.connectorsUrl}
            target="_blank"
            rel="noreferrer"
            data-ocid="setup.open_grok_connectors"
          >
            Open Grok connectors
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCopyUrl}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy MCP URL
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Official docs:{" "}
        <a
          href={AI_APPS.grok.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          docs.x.ai/grok/connectors
        </a>
        . Business/Enterprise orgs may need an admin to provision connectors
        first.
      </p>
    </div>
  );
}

function ClaudeGuide({ onCopyUrl }: { onCopyUrl: () => void }) {
  return (
    <div
      data-ocid="setup.guide.claude"
      className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4"
    >
      <p className="text-sm font-medium text-foreground">
        Claude custom connector (web or Desktop)
      </p>
      <p className="text-xs text-muted-foreground">{AI_APPS.claude.planNote}</p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          Go to{" "}
          <a
            href={AI_APPS.claude.connectorsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Customize → Connectors
          </a>{" "}
          (direct link preferred — avoid hunting under Settings).
        </li>
        <li>
          Click the <strong className="text-foreground">+</strong> button next
          to <strong className="text-foreground">Connectors</strong>.
        </li>
        <li>
          Choose{" "}
          <strong className="text-foreground">Add custom connector</strong>.
        </li>
        <li>
          Name: <em>Internet Computer MCP</em>. URL:{" "}
          <code className="rounded bg-muted px-1 font-mono text-[11px] text-foreground">
            {MCP_CONNECTOR_URL}
          </code>
          . Leave OAuth client ID/secret empty unless your org requires them.
        </li>
        <li>
          Click <strong className="text-foreground">Add</strong>, then complete
          Internet Identity when prompted.
        </li>
        <li>
          In a chat, open <strong className="text-foreground">+</strong> →
          Connectors and enable this connector for the conversation. Prefer
          read-only tools Always allow; write/delete on Ask.
        </li>
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button asChild size="sm" variant="outline">
          <a
            href={AI_APPS.claude.connectorsUrl}
            target="_blank"
            rel="noreferrer"
            data-ocid="setup.open_claude_connectors"
          >
            Open Claude Connectors
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onCopyUrl}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy MCP URL
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Help article:{" "}
        <a
          href={AI_APPS.claude.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          Use connectors to extend Claude
        </a>
        . Free plan: one custom connector.
      </p>
    </div>
  );
}

function ChatGptGuide({ onCopyUrl }: { onCopyUrl: () => void }) {
  return (
    <div
      data-ocid="setup.guide.chatgpt"
      className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4"
    >
      <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-muted-foreground">
        <AlertTriangle
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
          aria-hidden
        />
        <p>
          Many personal ChatGPT accounts cannot add remote MCP servers. If you
          do not see Apps / Connectors / Developer mode, use{" "}
          <strong className="text-foreground">Grok</strong> or{" "}
          <strong className="text-foreground">Claude</strong> — same MCP URL.
        </p>
      </div>
      <p className="text-sm font-medium text-foreground">
        ChatGPT (when your plan supports it)
      </p>
      <p className="text-xs text-muted-foreground">
        {AI_APPS.chatgpt.planNote}
      </p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
        <li>
          Open ChatGPT settings. Under{" "}
          <strong className="text-foreground">Advanced</strong> (or similar),
          enable <strong className="text-foreground">Developer mode</strong> if
          shown.
        </li>
        <li>
          Open <strong className="text-foreground">Apps</strong>,{" "}
          <strong className="text-foreground">Connectors</strong>, or{" "}
          <strong className="text-foreground">Plugins</strong> (label depends on
          plan).
        </li>
        <li>
          Create app / add connector / add MCP server and paste{" "}
          <code className="rounded bg-muted px-1 font-mono text-[11px] text-foreground">
            {MCP_CONNECTOR_URL}
          </code>
          .
        </li>
        <li>
          Complete Internet Identity authorization when ChatGPT redirects you.
        </li>
        <li>
          Start a new chat that can use the app/connector, then run a smoke-test
          question.
        </li>
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" size="sm" variant="secondary" onClick={onCopyUrl}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy MCP URL
        </Button>
      </div>
    </div>
  );
}

function Trouble({ title, body }: { title: string; body: ReactNode }) {
  return (
    <li className="rounded-lg border border-border bg-secondary/20 p-3">
      <p className="font-medium text-foreground">{title}</p>
      <div className="mt-1 leading-relaxed">{body}</div>
    </li>
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
          <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
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
