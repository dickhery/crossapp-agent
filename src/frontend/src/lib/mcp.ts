// Canonical Internet Computer MCP beta connector values used across Setup,
// plan copy affordances, and onboarding copy. Keep in sync with
// https://mcp.beta.id.ai/ and backend/lib/offline-plan.mo.

export const MCP_CONNECTOR_URL = "https://mcp.beta.id.ai/mcp-prod";
export const II_TRUSTED_MCP_SETTINGS_URL = "https://id.ai/manage/settings";
export const MCP_DOCS_URL = "https://mcp.beta.id.ai/";

/** Where to add a custom MCP connector in each supported AI app. */
export const AI_APPS = {
  grok: {
    name: "Grok",
    recommended: true,
    connectorsUrl: "https://grok.com/connectors",
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
    "Execute this Internet Computer cross-app plan using the IC MCP connector.",
    `MCP URL: ${MCP_CONNECTOR_URL}`,
    "If the IC MCP tools are not already connected in this chat, connect them first, then run the plan.",
    "Prefer read-only tools (canister_query, discovery, get_canister_candid) before any canister_update_call.",
    "Confirm write/delete actions with me. Respect every personal rule listed in the plan.",
    "Be cycle-conscious: no redundant status loops; check icp_cycles_balance before create/top-up.",
    "",
    planText.trim(),
  ].join("\n");
}
