import Common "common";

module {
  // Domain types for the CrossApp Agent core: workflows, preferences, history,
  // and the chat conversation that drives plan generation.

  // A preferred dApp with its related canisters and the agent's account IDs
  // for that app (so plans can tell MCP agents where to send ICP/tokens).
  public type PreferredDApp = {
    id : Nat;                 // stable id within the owner's dApp list
    friendlyName : Text;     // human label, e.g. "My NFT Vault"
    canisterIds : [Text];    // one or more canister principals for this app
    accountIds : [Text];     // agent account IDs under this app (ICRC/account hex/principal)
  };

  // A personal rule / constraint the agent must respect when planning.
  public type Rule = {
    id : Nat;     // stable id within the owner's rule list
    text : Text;  // free-text rule, e.g. "Never move more than 50% of my ICP"
  };

  // Per-user preferences, stored once per owner.
  public type Preferences = {
    dApps : [PreferredDApp];  // preferred dApps / important canister IDs
    rules : [Rule];            // personal rules and constraints
    notes : Text;              // persistent notes / context for the agent
  };

  // A reusable, saved plan. Stored per owner.
  public type Workflow = {
    id : Common.WorkflowId;
    owner : Common.Owner;    // the principal that owns this workflow
    name : Text;
    description : Text;
    tags : [Text];
    planText : Text;
    favorite : Bool;
    createdAt : Common.Timestamp;
    updatedAt : Common.Timestamp;
  };

  // A chronological log entry of a plan the user generated.
  public type HistoryEntry = {
    id : Common.HistoryId;
    owner : Common.Owner;    // the principal that owns this history entry
    goal : Text;              // short goal summary
    planText : Text;          // full generated plan
    createdAt : Common.Timestamp;
  };

  // A single message in the active conversation.
  public type ChatMessage = {
    role : Common.ChatRole;
    content : Text;
    timestamp : Common.Timestamp;
  };

  // The full conversation context passed to generatePlan / refinePlan.
  public type Conversation = {
    messages : [ChatMessage];
  };

  // Result of a plan generation / refinement outcall.
  public type PlanResult = {
    planText : Text;          // the structured, numbered, MCP-ready plan
  };
};
