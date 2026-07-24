import Map "mo:core/Map";
import List "mo:core/List";

// Initial migration: introduces the CrossApp Agent core stable state for the
// first time. The previous actor was empty (OldActor = {}), so every stable
// field declared in main.mo is enumerated in NewActor and initialized to an
// empty container / default value. The actor body declares these fields with
// types only (no inline initializers); the migration chain supplies the values.
//
// Self-contained: only mo:core imports, no project module imports. The chain
// replays forever on fresh install, so old/new types are inlined here.

module {
  // Previous actor signature: empty (no stable fields before this build).
  type OldActor = {};

  // New actor signature: every stable field declared in main.mo.
  // Field names, types, and mutability must match the actor body exactly.
  type NextWorkflowId = { var next : Nat };
  type NextHistoryId = { var next : Nat };

  // Inlined authorization state type (the chain must not import project
  // modules). Mirrors caffeineai-authorization's AccessControlState.
  type UserRole = { #admin; #user; #guest };
  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  type NewActor = {
    accessControlState : AccessControlState;
    workflowsByOwner : Map.Map<Principal, List.List<Workflow>>;
    preferencesByOwner : Map.Map<Principal, Preferences>;
    historyByOwner : Map.Map<Principal, List.List<HistoryEntry>>;
    workflowIdsByOwner : Map.Map<Principal, NextWorkflowId>;
    historyIdsByOwner : Map.Map<Principal, NextHistoryId>;
    openAIApiKey : { var value : ?Text };
  };

  // Inlined record types (the chain must not import project modules).
  type PreferredDApp = {
    id : Nat;
    friendlyName : Text;
    canisterId : Text;
  };
  type Rule = {
    id : Nat;
    text : Text;
  };
  type Preferences = {
    dApps : [PreferredDApp];
    rules : [Rule];
    notes : Text;
  };
  type Workflow = {
    id : Nat;
    owner : Principal;
    name : Text;
    description : Text;
    tags : [Text];
    planText : Text;
    favorite : Bool;
    createdAt : Int;
    updatedAt : Int;
  };
  type HistoryEntry = {
    id : Nat;
    owner : Principal;
    goal : Text;
    planText : Text;
    createdAt : Int;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      workflowsByOwner = Map.empty();
      preferencesByOwner = Map.empty();
      historyByOwner = Map.empty();
      workflowIdsByOwner = Map.empty();
      historyIdsByOwner = Map.empty();
      openAIApiKey = { var value = null };
    };
  };
};
