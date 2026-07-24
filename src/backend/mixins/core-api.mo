import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import Common "../types/common";
import Core "../types/core";
import CoreLib "../lib/core";

// Public API surface for the CrossApp Agent core domain.
//
// Every method enforces owner-only access: the caller's principal must match
// the data owner. State is injected via the mixin parameters and delegated to
// CoreLib. Anonymous callers are rejected.
//
// The OpenAI API key is admin-managed (single operator-funded bearer). The
// setter is gated on the #admin role from extension-authorization; the only
// outward-facing read is `isOpenAIConfigured : async Bool` — there is no
// getter that returns the key, ever.

mixin (
  workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
  preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
  historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
  workflowIdsByOwner : Map.Map<Common.Owner, { var next : Common.WorkflowId }>,
  historyIdsByOwner : Map.Map<Common.Owner, { var next : Common.HistoryId }>,
  accessControlState : AccessControl.AccessControlState,
  openAIApiKey : { var value : ?Text },
) {

  // Rejects anonymous callers. All data is owner-scoped, so an anonymous
  // principal can never be a valid owner.
  func requireOwner(caller : Common.Owner) : () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: anonymous caller");
    };
  };

  // --- Workflows -----------------------------------------------------------

  public query ({ caller }) func listWorkflows() : async [Core.Workflow] {
    requireOwner(caller);
    CoreLib.listWorkflows(workflowsByOwner, caller);
  };

  public query ({ caller }) func getWorkflow(id : Common.WorkflowId) : async ?Core.Workflow {
    requireOwner(caller);
    CoreLib.getWorkflow(workflowsByOwner, caller, id);
  };

  public shared ({ caller }) func createWorkflow(
    name : Text,
    description : Text,
    tags : [Text],
    planText : Text,
    favorite : Bool,
  ) : async Core.Workflow {
    requireOwner(caller);
    CoreLib.createWorkflow(
      workflowsByOwner,
      workflowIdsByOwner,
      caller,
      name,
      description,
      tags,
      planText,
      favorite,
    );
  };

  public shared ({ caller }) func updateWorkflow(workflow : Core.Workflow) : async ?Core.Workflow {
    requireOwner(caller);
    // Defensive: ensure the workflow's owner field matches the caller. Even
    // though the lib only mutates the caller's own list, a client could try
    // to supply a workflow record with a foreign owner field.
    if (workflow.owner != caller) {
      Runtime.trap("Unauthorized: workflow owner mismatch");
    };
    CoreLib.updateWorkflow(workflowsByOwner, caller, workflow);
  };

  public shared ({ caller }) func duplicateWorkflow(id : Common.WorkflowId) : async ?Core.Workflow {
    requireOwner(caller);
    CoreLib.duplicateWorkflow(workflowsByOwner, workflowIdsByOwner, caller, id);
  };

  public shared ({ caller }) func deleteWorkflow(id : Common.WorkflowId) : async Bool {
    requireOwner(caller);
    CoreLib.deleteWorkflow(workflowsByOwner, caller, id);
  };

  public shared ({ caller }) func toggleFavorite(id : Common.WorkflowId) : async ?Core.Workflow {
    requireOwner(caller);
    CoreLib.toggleFavorite(workflowsByOwner, caller, id);
  };

  public query ({ caller }) func searchWorkflows(searchText : Text) : async [Core.Workflow] {
    requireOwner(caller);
    CoreLib.searchWorkflows(workflowsByOwner, caller, searchText);
  };

  public query ({ caller }) func exportWorkflowMarkdown(id : Common.WorkflowId) : async ?Text {
    requireOwner(caller);
    CoreLib.exportWorkflowMarkdown(workflowsByOwner, caller, id);
  };

  // --- Preferences ---------------------------------------------------------

  // Always returns a Preferences record (empty defaults for first-time
  // users). Returning null forced the frontend into a loading loop because
  // `null` is falsy and was treated as "not yet loaded". Queries never write —
  // the empty default is ephemeral until the user saves.
  public query ({ caller }) func getPreferences() : async Core.Preferences {
    requireOwner(caller);
    switch (CoreLib.getPreferences(preferencesByOwner, caller)) {
      case (?prefs) { prefs };
      case null {
        { dApps = []; rules = []; notes = "" };
      };
    };
  };

  public shared ({ caller }) func savePreferences(prefs : Core.Preferences) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.savePreferences(preferencesByOwner, caller, prefs);
  };

  public shared ({ caller }) func addDApp(
    friendlyName : Text,
    canisterId : Text,
  ) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.addDApp(preferencesByOwner, caller, friendlyName, canisterId);
  };

  public shared ({ caller }) func updateDApp(dApp : Core.PreferredDApp) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.updateDApp(preferencesByOwner, caller, dApp);
  };

  public shared ({ caller }) func deleteDApp(id : Nat) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.deleteDApp(preferencesByOwner, caller, id);
  };

  public shared ({ caller }) func addRule(text : Text) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.addRule(preferencesByOwner, caller, text);
  };

  public shared ({ caller }) func updateRule(rule : Core.Rule) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.updateRule(preferencesByOwner, caller, rule);
  };

  public shared ({ caller }) func deleteRule(id : Nat) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.deleteRule(preferencesByOwner, caller, id);
  };

  public shared ({ caller }) func setNotes(notes : Text) : async Core.Preferences {
    requireOwner(caller);
    CoreLib.setNotes(preferencesByOwner, caller, notes);
  };

  // --- History -------------------------------------------------------------

  public query ({ caller }) func listHistory() : async [Core.HistoryEntry] {
    requireOwner(caller);
    CoreLib.listHistory(historyByOwner, caller);
  };

  public query ({ caller }) func getHistoryEntry(id : Common.HistoryId) : async ?Core.HistoryEntry {
    requireOwner(caller);
    CoreLib.getHistoryEntry(historyByOwner, caller, id);
  };

  public shared ({ caller }) func deleteHistoryEntry(id : Common.HistoryId) : async Bool {
    requireOwner(caller);
    CoreLib.deleteHistoryEntry(historyByOwner, caller, id);
  };

  // --- Plan generation -----------------------------------------------------

  // Generates a structured, numbered plan from a natural-language goal,
  // incorporating the caller's stored preferences as context. The plan is also
  // recorded in the caller's history.
  public shared ({ caller }) func generatePlan(
    goal : Text,
    conversation : Core.Conversation,
  ) : async Core.PlanResult {
    requireOwner(caller);
    await CoreLib.generatePlan(
      preferencesByOwner,
      historyByOwner,
      historyIdsByOwner,
      openAIApiKey,
      caller,
      goal,
      conversation,
    );
  };

  // Refines an existing plan based on a follow-up instruction, regenerating or
  // updating the plan via the external AI model.
  public shared ({ caller }) func refinePlan(
    instruction : Text,
    conversation : Core.Conversation,
  ) : async Core.PlanResult {
    requireOwner(caller);
    await CoreLib.refinePlan(
      preferencesByOwner,
      openAIApiKey,
      caller,
      instruction,
      conversation,
    );
  };

  // --- OpenAI configuration (admin-only) -----------------------------------

  // Returns whether an OpenAI API key has been configured. Never returns the
  // key itself — the frontend renders its empty state from this boolean.
  public query func isOpenAIConfigured() : async Bool {
    openAIApiKey.value != null;
  };

  // Sets the OpenAI API key. Admin-only: a non-admin gate is not enough
  // because any logged-in user could otherwise overwrite the operator's
  // billing key.
  public shared ({ caller }) func setOpenAIApiKey(key : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can set the OpenAI API key");
    };
    openAIApiKey.value := ?key;
  };
};
