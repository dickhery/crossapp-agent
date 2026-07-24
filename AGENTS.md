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
- Keep Caffeine import shape: root `caffeine.toml` with `[workspace]`, single Motoko canister named `backend`, generated `backend.ts`/`declarations/` only via bindgen, `env.json` + `copy:env`, and `skipIfMissing = true` on check-stable.
- Prefer offline template plans when OpenAI is unset so plan generation does not require HTTPS outcalls (cycles + operability).
