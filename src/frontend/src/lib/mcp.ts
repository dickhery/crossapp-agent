// Canonical Internet Computer MCP beta connector values used across Setup,
// plan copy affordances, and onboarding copy. Keep in sync with
// https://mcp.beta.id.ai/ and backend/lib/offline-plan.mo.
//
// Connector *display name* is stored in localStorage only (zero canister
// cycles) so Copy for MCP can say "use Agent Identity" when the user named
// their Grok/Claude connector that way.

export const MCP_CONNECTOR_URL = "https://mcp.beta.id.ai/mcp-prod";
export const II_TRUSTED_MCP_SETTINGS_URL = "https://id.ai/manage/settings";
export const MCP_DOCS_URL = "https://mcp.beta.id.ai/";
export const GROK_CONNECTORS_URL = "https://grok.com/connectors";
export const GROK_CHAT_URL = "https://grok.com/";

/** Default label if the user has not set a custom connector name. */
export const DEFAULT_CONNECTOR_DISPLAY_NAME = "Internet Computer MCP";

const CONNECTOR_NAME_STORAGE_KEY = "icp-mcp-assistant.connectorDisplayName.v1";

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

/** Read the user-chosen connector label (e.g. "Agent Identity"). */
export function getConnectorDisplayName(): string {
  try {
    const raw = localStorage.getItem(CONNECTOR_NAME_STORAGE_KEY);
    const trimmed = raw?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : DEFAULT_CONNECTOR_DISPLAY_NAME;
  } catch {
    return DEFAULT_CONNECTOR_DISPLAY_NAME;
  }
}

/**
 * Persist connector display name in this browser only.
 * Empty string resets to the default label.
 */
export function setConnectorDisplayName(name: string): string {
  const trimmed = name.trim();
  try {
    if (trimmed.length === 0) {
      localStorage.removeItem(CONNECTOR_NAME_STORAGE_KEY);
    } else {
      // Soft cap to keep clipboard payloads small.
      const limited = trimmed.slice(0, 80);
      localStorage.setItem(CONNECTOR_NAME_STORAGE_KEY, limited);
      return limited;
    }
  } catch {
    // Private mode / quota — ignore; getConnectorDisplayName still works.
  }
  return getConnectorDisplayName();
}

/**
 * Prefix pasted into Grok / Claude / ChatGPT so the agent targets the user's
 * named MCP connector (e.g. "Agent Identity") and the IC MCP URL.
 */
export function planClipboardPayload(
  planText: string,
  connectorDisplayName?: string,
): string {
  const name = (
    connectorDisplayName?.trim() || getConnectorDisplayName()
  ).trim();
  const label = name.length > 0 ? name : DEFAULT_CONNECTOR_DISPLAY_NAME;

  return [
    "You are my Internet Computer agent. Execute this workflow using my IC MCP connector.",
    `Use the MCP connector named exactly: "${label}"`,
    `That connector's server URL is: ${MCP_CONNECTOR_URL}`,
    `In this chat, only use tools from "${label}". If that connector is not enabled for this conversation, stop and tell me to turn on "${label}" (or reconnect it) before continuing.`,
    "Prefer read-only tools first: canister_query, discovery, get_canister_candid, get_app_principal, resolve_app.",
    "Ask me before any write/delete (canister_update_call, top-up, install, delete).",
    "Respect every personal rule mentioned in the plan. Be cycle-conscious: no redundant loops; check icp_cycles_balance before create/top-up.",
    "When done, summarize results clearly (balances, principals, what changed).",
    "",
    "--- WORKFLOW ---",
    planText.trim(),
  ].join("\n");
}
