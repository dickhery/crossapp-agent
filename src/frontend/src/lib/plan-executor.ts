import type { Identity } from "@icp-sdk/core/agent";
import type { Principal } from "@icp-sdk/core/principal";

import { createMainnetAgent } from "@/lib/ic-agent";
import { type TokenBalance, fetchIcrc1Balance } from "@/lib/icrc-ledger";
import {
  GROK_CONNECTORS_URL,
  MCP_CONNECTOR_URL,
  planClipboardPayload,
} from "@/lib/mcp";
import {
  CYCLES_LEDGER_CANISTER_ID,
  ICP_LEDGER_CANISTER_ID,
  NNS_APP_URL,
} from "@/lib/well-known";
import type { PreferredDApp } from "@/types";

export type ExecutionStepResult = {
  title: string;
  ok: boolean;
  detail: string;
};

export type PlanExecutionResult = {
  summary: string;
  steps: ExecutionStepResult[];
  /** Ready-to-paste payload for full MCP agent (Grok/Claude). */
  mcpFollowUp: string;
};

export type ExecutePlanInput = {
  goal: string;
  planText: string;
  identity: Identity | null | undefined;
  principal: Principal | null | undefined;
  dApps: PreferredDApp[];
};

function lower(s: string) {
  return s.toLowerCase();
}

function isBalanceGoal(goal: string): boolean {
  const g = lower(goal);
  return (
    g.includes("balance") ||
    g.includes("how much") ||
    g.includes("check my") ||
    (g.includes("icp") && (g.includes("account") || g.includes("ledger")))
  );
}

function pickLedgerCanisterIds(goal: string, dApps: PreferredDApp[]): string[] {
  const ids = new Set<string>();
  const g = lower(goal);

  // Always include ICP ledger for ICP/NNS/ledger balance goals.
  if (
    g.includes("icp") ||
    g.includes("nns") ||
    g.includes("ledger") ||
    isBalanceGoal(goal)
  ) {
    ids.add(ICP_LEDGER_CANISTER_ID);
  }

  for (const d of dApps) {
    const name = lower(d.friendlyName);
    const id = d.canisterId.trim();
    if (!id) continue;
    if (
      name.includes("ledger") ||
      name.includes("icp") ||
      id === ICP_LEDGER_CANISTER_ID ||
      id === CYCLES_LEDGER_CANISTER_ID
    ) {
      ids.add(id);
    }
  }

  if (ids.size === 0) ids.add(ICP_LEDGER_CANISTER_ID);
  return [...ids];
}

function formatBalanceLine(b: TokenBalance, label?: string): string {
  const head = label ? `${label}: ` : "";
  return `${head}${b.formatted} ${b.symbol} (${b.name})\n  raw=${b.raw.toString()} · decimals=${b.decimals}\n  ledger=${b.canisterId}\n  owner principal=${b.owner}`;
}

/**
 * Execute what this Caffeine app can run safely in the browser:
 * read-only ICRC-1 balance queries as the signed-in II principal for *this* app.
 *
 * Full cross-app MCP (act as your NNS principal, updates, etc.) still requires
 * Grok/Claude with the IC MCP connector — OAuth redirect allow-listing prevents
 * this SPA from becoming a full remote MCP OAuth client without DFINITY approval.
 *
 * All calls are browser → IC boundary nodes: **zero cycles** on the CrossApp
 * backend canister.
 */
export async function executePlanInApp(
  input: ExecutePlanInput,
): Promise<PlanExecutionResult> {
  const steps: ExecutionStepResult[] = [];
  const { goal, planText, identity, principal, dApps } = input;

  if (!identity || !principal) {
    return {
      summary:
        "Cannot execute: you are not signed in with Internet Identity in this app.",
      steps: [
        {
          title: "Authenticate",
          ok: false,
          detail: "Sign in, then press Run now again.",
        },
      ],
      mcpFollowUp: planClipboardPayload(planText),
    };
  }

  steps.push({
    title: "Session",
    ok: true,
    detail: `Signed in as ${principal.toText()} (principal at *this* app origin).`,
  });

  const agent = await createMainnetAgent(identity);

  if (isBalanceGoal(goal) || lower(goal).includes("ledger")) {
    const ledgers = pickLedgerCanisterIds(goal, dApps);
    const balances: TokenBalance[] = [];

    for (const canisterId of ledgers) {
      try {
        const bal = await fetchIcrc1Balance(agent, canisterId, principal);
        balances.push(bal);
        const label =
          dApps.find((d) => d.canisterId.trim() === canisterId)?.friendlyName ??
          (canisterId === ICP_LEDGER_CANISTER_ID ? "ICP Ledger" : canisterId);
        steps.push({
          title: `Balance · ${label}`,
          ok: true,
          detail: formatBalanceLine(bal, label),
        });
      } catch (e) {
        steps.push({
          title: `Balance · ${canisterId}`,
          ok: false,
          detail:
            e instanceof Error
              ? e.message
              : "Query failed (canister may not be ICRC-1).",
        });
      }
    }

    const icp = balances.find((b) => b.canisterId === ICP_LEDGER_CANISTER_ID);
    const summaryLines = [
      "## Execution results (in-app)",
      "",
      icp
        ? `**ICP balance at this app's principal:** ${icp.formatted} ${icp.symbol}`
        : "**ICP balance:** could not read (see step details).",
      "",
      "### Principal note (important)",
      "Internet Identity gives you a **different principal per app**.",
      `The balance above is for your principal at **CrossApp Agent**, not automatically your principal at [${NNS_APP_URL}](${NNS_APP_URL}).`,
      "To check the balance of your **NNS dapp** principal, run the same goal in **Grok** (or Claude) with the IC MCP connector authorized for Actions & questions — MCP will call `get_app_principal` / `canister_query` under the NNS derivation origin.",
      "",
      "### How to finish via MCP (full cross-app agent)",
      `1. Trust MCP at Internet Identity if you have not: add \`${MCP_CONNECTOR_URL}\`.`,
      `2. Connect Grok: ${GROK_CONNECTORS_URL} → New Connector → Custom → paste that URL.`,
      "3. Press **Copy for MCP** below (or use the button on the plan), paste into Grok, and ask it to execute.",
      "",
      "### Step log",
      ...steps.map(
        (s, i) => `${i + 1}. ${s.ok ? "✓" : "✗"} **${s.title}**\n${s.detail}`,
      ),
    ];

    return {
      summary: summaryLines.join("\n"),
      steps,
      mcpFollowUp: planClipboardPayload(
        [
          goal,
          "",
          "Use IC MCP tools. Preferred canisters from CrossApp Agent memory:",
          ...dApps.map((d) => `- ${d.friendlyName}: ${d.canisterId}`),
          "",
          "Suggested MCP steps:",
          "1. resolve_app for https://nns.ic0.app",
          "2. get_app_principal for that app",
          "3. canister_query on ryjl3-tyaaa-aaaaa-aaaba-cai icrc1_balance_of for that principal",
          "4. Report the ICP balance clearly",
          "",
          planText,
        ].join("\n"),
      ),
    };
  }

  // Generic fallback: inspect memory canisters with public metadata via agent status-ish queries
  steps.push({
    title: "In-app scope",
    ok: true,
    detail:
      "This goal needs discovery or write tools that the hosted SPA cannot open through MCP OAuth (redirect allow-list). Use Grok/Claude MCP for full execution.",
  });

  if (dApps.length > 0) {
    steps.push({
      title: "Memory apps",
      ok: true,
      detail: dApps
        .map((d) => `- ${d.friendlyName}: ${d.canisterId}`)
        .join("\n"),
    });
  }

  return {
    summary: [
      "## Execution results (in-app)",
      "",
      "This goal is beyond the **read-only, same-origin principal** executor built into CrossApp Agent.",
      "",
      "**What this app can run in-browser (no backend cycles):** ICRC-1 balance queries as your CrossApp principal.",
      "**What requires Grok/Claude + IC MCP:** act-as-you at NNS and other apps, updates, cycles management, multi-dApp migrations.",
      "",
      "Use **Copy for MCP** and paste into Grok with the connector enabled to execute the full plan.",
      "",
      "### Step log",
      ...steps.map(
        (s, i) => `${i + 1}. ${s.ok ? "✓" : "✗"} **${s.title}**\n${s.detail}`,
      ),
    ].join("\n"),
    steps,
    mcpFollowUp: planClipboardPayload(planText),
  };
}
