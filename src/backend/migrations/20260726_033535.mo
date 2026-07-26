import Map "mo:core/Map";

// Migrates PreferredDApp from a single canisterId to multi canisterIds +
// accountIds so Memory can bundle each app's canisters with the agent's
// in-app account identifiers. Self-contained: no project module imports.

module {
  type OldPreferredDApp = {
    id : Nat;
    friendlyName : Text;
    canisterId : Text;
  };

  type NewPreferredDApp = {
    id : Nat;
    friendlyName : Text;
    canisterIds : [Text];
    accountIds : [Text];
  };

  type Rule = {
    id : Nat;
    text : Text;
  };

  type OldPreferences = {
    dApps : [OldPreferredDApp];
    rules : [Rule];
    notes : Text;
  };

  type NewPreferences = {
    dApps : [NewPreferredDApp];
    rules : [Rule];
    notes : Text;
  };

  public func migration(
    old : { preferencesByOwner : Map.Map<Principal, OldPreferences> }
  ) : { preferencesByOwner : Map.Map<Principal, NewPreferences> } {
    let preferencesByOwner = old.preferencesByOwner.map<Principal, OldPreferences, NewPreferences>(
      func(_, prefs) {
        {
          rules = prefs.rules;
          notes = prefs.notes;
          dApps = prefs.dApps.map<OldPreferredDApp, NewPreferredDApp>(
            func(d) {
              {
                id = d.id;
                friendlyName = d.friendlyName;
                canisterIds = if (d.canisterId == "") { [] } else { [d.canisterId] };
                accountIds = [];
              }
            }
          );
        }
      }
    );
    { preferencesByOwner };
  };
};
