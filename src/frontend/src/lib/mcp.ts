// Canonical Internet Computer MCP beta connector values used across Setup,
// plan copy affordances, and onboarding copy. Keep in sync with
// https://mcp.beta.id.ai/ and backend/lib/offline-plan.mo.
//
// Connector *display name* and the grant-all-permissions default are stored in
// localStorage only (zero canister cycles) so Copy for MCP can name the user's
// Grok/Claude connector and optionally pre-authorize agent tool use.

export const MCP_CONNECTOR_URL = "https://mcp.beta.id.ai/mcp-prod";
export const II_TRUSTED_MCP_SETTINGS_URL = "https://id.ai/manage/settings";
export const MCP_DOCS_URL = "https://mcp.beta.id.ai/";
export const GROK_CONNECTORS_URL = "https://grok.com/connectors";
export const GROK_CHAT_URL = "https://grok.com/";

/** Default label if the user has not set a custom connector name. */
export const DEFAULT_CONNECTOR_DISPLAY_NAME = "Internet Computer MCP";

const CONNECTOR_NAME_STORAGE_KEY = "icp-mcp-assistant.connectorDisplayName.v1";
const GRANT_ALL_PERMISSIONS_STORAGE_KEY =
  "icp-mcp-assistant.grantAllAgentPermissions.v1";

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

/** Options for building the Copy for MCP clipboard payload. */
export type PlanClipboardOptions = {
  /** Connector label as shown in Grok/Claude (e.g. "Agent Identity"). */
  connectorDisplayName?: string;
  /**
   * When true, the paste text pre-authorizes full read / write / execute tool
   * use so the external AI agent need not pause for per-step confirmation.
   * Default is false (safer: prefer read-only, ask before writes).
   */
  grantAllPermissions?: boolean;
};

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
 * Default for the "grant all read/write/execute" pre-confirmation toggle.
 * Browser-local only — never stored on the canister (zero cycles).
 */
export function getGrantAllPermissionsDefault(): boolean {
  try {
    return localStorage.getItem(GRANT_ALL_PERMISSIONS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persist the default grant-all-permissions preference for this browser.
 * Returns the value that was stored.
 */
export function setGrantAllPermissionsDefault(grantAll: boolean): boolean {
  try {
    if (grantAll) {
      localStorage.setItem(GRANT_ALL_PERMISSIONS_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(GRANT_ALL_PERMISSIONS_STORAGE_KEY);
    }
  } catch {
    // Private mode / quota — ignore; getGrantAllPermissionsDefault still works.
  }
  return grantAll;
}

/**
 * Safety / permission lines embedded in the Copy for MCP prompt.
 * Separated for unit-style reuse and clear default vs pre-grant wording.
 */
export function agentPermissionLines(grantAllPermissions: boolean): string[] {
  if (grantAllPermissions) {
    return [
      "PERMISSIONS (pre-confirmed by me for this workflow): I grant this agent full READ, WRITE, and EXECUTE access to tools from the named MCP connector.",
      "Do not wait for per-step confirmation. Proceed autonomously through the plan: use read tools when sufficient; use write/update/execute tools (canister_update_call, top-up, install, delete, and similar) when a step requires them.",
      "Still respect every personal rule in the plan. Be cycle-conscious: no redundant loops; check icp_cycles_balance before create/top-up. If a step clearly violates a personal rule or goes beyond the plan scope, stop and explain.",
    ];
  }
  return [
    "Prefer read-only tools first: canister_query, discovery, get_canister_candid, get_app_principal, resolve_app.",
    "Ask me before any write/delete (canister_update_call, top-up, install, delete).",
    "Respect every personal rule mentioned in the plan. Be cycle-conscious: no redundant loops; check icp_cycles_balance before create/top-up.",
  ];
}

/**
 * Prefix pasted into Grok / Claude / ChatGPT so the agent targets the user's
 * named MCP connector (e.g. "Agent Identity") and the IC MCP URL.
 * Optionally pre-grants read/write/execute so the agent need not pause for
 * confirmation on each tool call.
 */
export function planClipboardPayload(
  planText: string,
  options?: PlanClipboardOptions,
): string {
  const name = (
    options?.connectorDisplayName?.trim() || getConnectorDisplayName()
  ).trim();
  const label = name.length > 0 ? name : DEFAULT_CONNECTOR_DISPLAY_NAME;
  const grantAll =
    options?.grantAllPermissions ?? getGrantAllPermissionsDefault();

  return [
    "You are my Internet Computer agent. Execute this workflow using my IC MCP connector.",
    `Use the MCP connector named exactly: "${label}"`,
    `That connector's server URL is: ${MCP_CONNECTOR_URL}`,
    `In this chat, only use tools from "${label}". If that connector is not enabled for this conversation, stop and tell me to turn on "${label}" (or reconnect it) before continuing.`,
    ...agentPermissionLines(grantAll),
    "When done, summarize results clearly (balances, principals, what changed).",
    "",
    "--- WORKFLOW ---",
    planText.trim(),
  ].join("\n");
}
