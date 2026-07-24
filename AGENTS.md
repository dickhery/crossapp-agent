# Project Guidance

## User Preferences

[No preferences yet]

## Verified Commands

**Frontend** (run from `src/frontend/`):

- **install**: `pnpm install --prefer-offline`
- **typecheck**: `pnpm typecheck`
- **lint fix**: `pnpm fix`
- **build**: `pnpm build`

**Backend** (run from `src/backend/`):

- **install**: `mops install`
- **typecheck**: `mops check --fix`
- **build**: `mops build`

**Backend and frontend integration** (run from root):

- **generate bindings**: `pnpm bindgen` This step is necessary to ensure the frontend can call the backend methods.

## Learnings

- After Internet Identity login, TanStack Router `beforeLoad` does **not** re-run unless `router.invalidate()` is called when `isAuthenticated` / `isInitializing` flip. Always pair `router.update({ context: { auth } })` with invalidate, and show a boot screen while `isInitializing`.
- The official IC MCP beta connector is `https://mcp.beta.id.ai/mcp-prod`. Plans must use real tool names (`canister_query`, `canister_update_call`, `resolve_app`, etc.), not invented ones like `icp.call_canister`.
- Grok supports custom MCP at `https://grok.com/connectors` → New Connector → Custom (personal accounts). Claude custom connectors live under **Customize → Connectors** (`claude.ai/customize/connectors`), not Settings. ChatGPT often needs Developer mode + Business/Enterprise — document that honestly and recommend Grok first.
- Keep Caffeine import shape: root `caffeine.toml` with `[workspace]`, single Motoko canister named `backend`, generated `backend.ts`/`declarations/` only via bindgen, `env.json` + `copy:env`, and `skipIfMissing = true` on check-stable.
- Prefer offline template plans when OpenAI is unset so plan generation does not require HTTPS outcalls (cycles + operability).
- Never treat a successful `null`/empty preferences response as "still loading". Memory page used `isFetching && !data` while `getPreferences` returned null for first-time users; combined with `useActor`'s invalidate-on-mount, that caused an infinite skeleton loop. Return empty Preferences defaults from the backend query and only skeleton when `data === undefined` before first fetch.
- Product name in UI: **ICP MCP Server Assistant** (`src/frontend/src/lib/brand.ts`). Backend canister stays `backend`.
- Users may name their Grok/Claude connector (e.g. "Agent Identity"). That label is stored in **localStorage** via `getConnectorDisplayName` / `setConnectorDisplayName` and embedded in **Copy for MCP** payloads — no canister state, zero cycles.
- This app is a **setup + workflow studio**, not an MCP executor. Users connect Grok/Claude to `https://mcp.beta.id.ai/mcp-prod`, draft plans here, then **Copy for MCP**.
