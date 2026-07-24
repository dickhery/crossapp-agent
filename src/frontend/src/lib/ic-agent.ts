import { HttpAgent, type Identity } from "@icp-sdk/core/agent";

/** Mainnet boundary node — browser calls never burn this canister's cycles. */
const IC_HOST = "https://icp-api.io";

/**
 * Build an HttpAgent for mainnet calls from the browser.
 * Prefer the signed-in II identity so query/update calls use this app's principal.
 */
export async function createMainnetAgent(identity?: Identity | null) {
  const agent = await HttpAgent.create({
    host: IC_HOST,
    ...(identity ? { identity } : {}),
  });
  return agent;
}
