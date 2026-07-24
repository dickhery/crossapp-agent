// Canonical Internet Computer MCP beta connector values used across Setup,
// plan copy affordances, and onboarding copy. Keep in sync with
// https://mcp.beta.id.ai/ and backend/lib/offline-plan.mo.

export const MCP_CONNECTOR_URL = "https://mcp.beta.id.ai/mcp-prod";
export const II_TRUSTED_MCP_SETTINGS_URL = "https://id.ai/manage/settings";
export const MCP_DOCS_URL = "https://mcp.beta.id.ai/";

/** Prefix pasted into Claude/ChatGPT so the agent knows how to execute a plan. */
export function planClipboardPayload(planText: string): string {
  return [
    "Execute this Internet Computer cross-app plan using the IC MCP server.",
    `MCP URL: ${MCP_CONNECTOR_URL}`,
    "Prefer read-only tools (canister_query, discovery, get_canister_candid) before any canister_update_call.",
    "Confirm write/delete actions with me. Respect every personal rule listed in the plan.",
    "",
    planText.trim(),
  ].join("\n");
}
