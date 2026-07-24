import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Core "../types/core";

// Deterministic, cycles-free plan scaffolding used when the admin OpenAI key
// is not configured. Produces MCP-tool-aware steps so the app stays usable as
// a planning surface without any HTTP outcall.
module {

  // MCP connector users must trust and add to their AI app.
  public let MCP_URL : Text = "https://mcp.beta.id.ai/mcp-prod";
  public let II_TRUST_URL : Text = "https://id.ai/manage/settings";

  func prefsBlock(prefs : Core.Preferences) : Text {
    var parts : [Text] = [];
    if (prefs.dApps.size() > 0) {
      let lines = prefs.dApps.map(
        func(d : Core.PreferredDApp) : Text {
          "  - " # d.friendlyName # " → " # d.canisterId
        },
      );
      parts := parts.concat(["Your preferred dApps / canisters:"].concat(lines));
    } else {
      parts := parts.concat([
        "Your preferred dApps / canisters: (none saved yet — add them under Memory)",
      ]);
    };
    if (prefs.rules.size() > 0) {
      let lines = prefs.rules.map(
        func(r : Core.Rule) : Text { "  - " # r.text },
      );
      parts := parts.concat(["Personal rules to respect:"].concat(lines));
    };
    if (not prefs.notes.isEmpty()) {
      parts := parts.concat(["Notes: " # prefs.notes]);
    };
    parts.vals().join("\n");
  };

  func hasKeyword(goal : Text, keyword : Text) : Bool {
    goal.toLower().contains(#text(keyword.toLower()));
  };

  // Pick a scenario template from simple keyword heuristics. Falls back to a
  // generic discovery + query + act sequence covering the MCP surface.
  func scenarioSteps(goal : Text, prefs : Core.Preferences) : [Text] {
    let balance =
      hasKeyword(goal, "balance") or hasKeyword(goal, "how much") or (hasKeyword(goal, "icp") and (hasKeyword(goal, "account") or hasKeyword(goal, "ledger") or hasKeyword(goal, "check")));
    let nftish =
      hasKeyword(goal, "nft") or hasKeyword(goal, "marketplace") or hasKeyword(goal, "vault") or (hasKeyword(goal, "list") and not balance);
    let social =
      hasKeyword(goal, "openchat") or hasKeyword(goal, "social") or hasKeyword(goal, "follow") or hasKeyword(goal, "post");
    let defi =
      hasKeyword(goal, "defi") or hasKeyword(goal, "swap") or hasKeyword(goal, "liquidity") or hasKeyword(goal, "position");
    let cycles =
      hasKeyword(goal, "cycles") or hasKeyword(goal, "top-up") or hasKeyword(goal, "top up") or (hasKeyword(goal, "canister") and not balance);

    // Balance / account checks first — "ledger" alone used to hit the DeFi
    // template and produce swap/approve steps for a simple ICP balance goal.
    if (balance) {
      var balSteps : [Text] = [
        "Identify the ICP ledger canister ryjl3-tyaaa-aaaaa-aaaba-cai (or the ledger in Memory).",
        "In CrossApp Agent press Run now to query icrc1_balance_of for your principal at this app (browser → IC, no backend cycles).",
        "For your NNS dapp principal balance, use Grok + IC MCP: resolve_app https://nns.ic0.app (MCP: resolve_app).",
        "Get your principal at NNS (MCP: get_app_principal) and list accounts if needed (MCP: list_app_accounts).",
        "Query ICP balance as that principal (MCP: canister_query on the ledger icrc1_balance_of) and report the amount in ICP.",
      ];
      if (prefs.dApps.size() > 0) {
        balSteps := balSteps.concat([
          "Also cross-check Memory dApps for any extra ledger principals the user registered.",
        ]);
      };
      return balSteps;
    };

    if (nftish) {
      return [
        "Confirm Internet Identity MCP grant is active for Actions & questions (not questions-only).",
        "Resolve source marketplace with (MCP: icp_find_app_by_name) or (MCP: resolve_app) using the app URL.",
        "List your accounts at that app with (MCP: list_app_accounts) and note the derived principal (MCP: get_app_principal).",
        "Fetch candid for the marketplace canister (MCP: get_canister_candid) and API guide if present (MCP: get_canister_api_doc).",
        "Query listings owned by your principal (MCP: canister_query) — prefer OQL when oql:true (MCP: icp_oql_guide, get_canister_oql_schema, canister_query).",
        "Identify rare vs bulk items using your rules; never move assets that violate a personal rule.",
        "Delist or transfer rare items into your vault canister with (MCP: canister_update_call) after confirming the method + args in Candid text.",
        "Re-list remaining items on the destination marketplace at +15% (or the price rule you set) via (MCP: canister_update_call).",
        "Verify final ownership and listing state with read-only (MCP: canister_query) before ending the session.",
      ];
    };

    if (social) {
      return [
        "Confirm MCP grant mode is Actions & questions if posts/follows must be written.",
        "Resolve both social apps (MCP: icp_find_app_by_name / resolve_app) and record derivation origins.",
        "Fetch your principal at each app (MCP: get_app_principal) and list accounts (MCP: list_app_accounts).",
        "Read source app candid (MCP: get_canister_candid) and query the last 30 days of posts + follows (MCP: canister_query).",
        "Export a temporary checklist of posts/follows to mirror; respect any privacy rules in Memory.",
        "On the destination app, create posts/follows with (MCP: canister_update_call) only after a dry-run summary.",
        "Spot-check destination state with (MCP: canister_query) and stop if a personal rule is about to be broken.",
      ];
    };

    if (defi) {
      return [
        "Check cycles-ledger balance before any management call (MCP: icp_cycles_balance) — keep a reserve.",
        "Resolve both protocol apps and their ledgers (MCP: icp_find_app_by_name, icp_find_canister_by_name, resolve_app).",
        "Look up ledger + pool candid (MCP: get_canister_candid) and current positions (MCP: canister_query).",
        "Estimate fees/slippage; if a Memory rule caps risk, surface it before any update call.",
        "Approve only the minimum allowance required (MCP: canister_update_call on the ledger approve path if ICRC-2).",
        "Exit the source position (MCP: canister_update_call), then open the destination position with the optimized size.",
        "Confirm balances and open positions on both protocols (MCP: canister_query).",
      ];
    };

    if (cycles) {
      return [
        "Read cycles-ledger balance (MCP: icp_cycles_balance) before creating or topping up canisters.",
        "Inspect target canister status (MCP: icp_canister_status) — memory, controllers, freezing threshold.",
        "If creating a canister, use (MCP: icp_create_canister) with a conservative cycle budget; prefer top-ups over oversized mints.",
        "Top up with (MCP: icp_top_up_canister) only after confirming the canister id and amount.",
        "Install or upgrade code only when required (MCP: icp_install_code); stop before delete (MCP: icp_stop_canister, icp_delete_canister).",
        "Re-check status (MCP: icp_canister_status) and leave a cycles buffer above the freezing threshold.",
      ];
    };

    // Generic cross-app template, still grounded in the live MCP tool names.
    var steps : [Text] = [
      "Confirm the IC MCP connector is trusted in Internet Identity settings and connected in your AI app.",
      "Authorize an Actions & questions grant (or questions-only if this is a research task). Grants expire — re-approve when asked.",
      "Discover target canisters: (MCP: discover_app_canisters), (MCP: icp_find_canister_by_name), or (MCP: icp_find_app_by_name).",
      "Resolve derivation origin for each app you will act as (MCP: resolve_app) and your principal there (MCP: get_app_principal).",
      "Load candid interfaces (MCP: get_canister_candid) and any published API docs (MCP: get_canister_api_doc).",
      "Prefer read-only discovery first: (MCP: canister_query). Use OQL tools when candid reports oql:true.",
      "Apply personal rules from Memory before any state change; refuse steps that violate them.",
      "Execute updates only with explicit consent via (MCP: canister_update_call) using textual Candid arguments.",
      "Verify results with another (MCP: canister_query) and summarize what changed for the user.",
    ];

    if (prefs.dApps.size() > 0) {
      let first = prefs.dApps[0];
      steps := steps.concat([
        "Start with preferred dApp \"" # first.friendlyName # "\" (" # first.canisterId # ") from Memory — confirm it with (MCP: icp_lookup_canister_info_by_id).",
      ]);
    };
    steps;
  };

  // Build a full offline plan document for the given goal + preferences.
  public func build(goal : Text, prefs : Core.Preferences) : Text {
    let steps = scenarioSteps(goal, prefs);
    var numbered : [Text] = [];
    var i = 1;
    for (step in steps.vals()) {
      numbered := Array.concat(numbered, [Nat.toText(i) # ". " # step]);
      i += 1;
    };

    let header =
      "[Template plan — AI model not configured on this canister. " #
      "Steps still target the official IC MCP tools so you can paste into Grok, Claude, or ChatGPT.]\n\n" #
      "Goal: " # goal # "\n\n" #
      prefsBlock(prefs) # "\n\n" #
      "MCP connector URL: " # MCP_URL # "\n" #
      "Trust server at: " # II_TRUST_URL # "\n\n" #
      "Plan:\n";

    header # numbered.vals().join("\n");
  };
};
