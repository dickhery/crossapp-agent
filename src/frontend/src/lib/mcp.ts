// Canonical Internet Computer MCP beta connector values used across Setup,
// plan copy affordances, and onboarding copy. Keep in sync with
// https://mcp.beta.id.ai/ and backend/lib/offline-plan.mo.

export const MCP_CONNECTOR_URL = "https://mcp.beta.id.ai/mcp-prod";
export const II_TRUSTED_MCP_SETTINGS_URL = "https://id.ai/manage/settings";
export const MCP_DOCS_URL = "https://mcp.beta.id.ai/";
export const GROK_CONNECTORS_URL = "https://grok.com/connectors";
export const GROK_CHAT_URL = "https://grok.com/";

/** Where to add a custom MCP connector in each supported AI app. */
export const AI_APPS = {
  grok: {
    name: "Grok",
    recommended: true,
    connectorsUrl: GROK_CONNECTORS_URL,
    docsUrl: "https://docs.x.ai/grok/connectors",
    planNote: "Works on personal Grok accounts — no business plan required.",
  },
  claude: {
    name: "Claude",
    recommended: false,
    /** Claude's Customize → Connectors surface (web + desktop). */
    connectorsUrl: "https://claude.ai/customize/connectors",
    docsUrl:
      "https://support.claude.com/en/articles/11176164-use-connectors-to-extend-claude-s-capabilities",
    planNote:
      "Custom connectors work on Free (1 custom), Pro, Max, Team, and Enterprise. UI label is Customize → Connectors, not Settings → Connectors.",
  },
  chatgpt: {
    name: "ChatGPT",
    recommended: false,
    connectorsUrl: "https://chatgpt.com/",
    docsUrl: "https://mcp.beta.id.ai/",
    planNote:
      "Custom MCP / Apps usually needs Developer mode and is limited on consumer plans — Business or Enterprise is often required. Prefer Grok or Claude if you hit plan walls.",
  },
} as const;

export type AiAppId = keyof typeof AI_APPS;

/** Prefix pasted into Grok / Claude / ChatGPT so the agent executes via IC MCP. */
export function planClipboardPayload(planText: string): string {
  return [
    "You are my Internet Computer agent. Execute this workflow using the IC MCP connector.",
    `MCP connector URL (must already be connected in this chat): ${MCP_CONNECTOR_URL}`,
    "If IC MCP tools are missing, stop and tell me to connect the custom MCP server first.",
    "Prefer read-only tools first: canister_query, discovery, get_canister_candid, get_app_principal, resolve_app.",
    "Ask me before any write/delete (canister_update_call, top-up, install, delete).",
    "Respect every personal rule mentioned in the plan. Be cycle-conscious: no redundant loops; check icp_cycles_balance before create/top-up.",
    "When done, summarize results clearly (balances, principals, what changed).",
    "",
    "--- WORKFLOW ---",
    planText.trim(),
  ].join("\n");
}
