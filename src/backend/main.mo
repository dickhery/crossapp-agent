import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Map "mo:core/Map";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import OQL "mo:caffeineai-oql";
import Expose "mo:caffeineai-oql/Expose";
import Common "types/common";
import Core "types/core";
import CoreApi "mixins/core-api";

actor {
  // --- Existing authorization state (preserved from scaffold) --------------
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  // --- Core domain stable state -------------------------------------------
  // Declared with types only; initial values come from the migration chain.
  // All collections are keyed by owner principal so each user's data is
  // isolated and enforceable as owner-only.

  // Per-owner workflows (a growable list per owner).
  let workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>;
  // Per-owner preferences (a single record per owner).
  let preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>;
  // Per-owner history entries (a growable list per owner).
  let historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>;
  // Per-owner next workflow id counter (wrapped in a record so mutations
  // propagate through the mixin parameter by reference).
  let workflowIdsByOwner : Map.Map<Common.Owner, { var next : Common.WorkflowId }>;
  // Per-owner next history id counter.
  let historyIdsByOwner : Map.Map<Common.Owner, { var next : Common.HistoryId }>;
  // Admin-set OpenAI bearer key. Wrapped in `{ var value : ?Text }` so the
  // mixin can mutate it. Type-only declaration; the migration chain supplies
  // the initial value. Never exposed via a getter — only `isOpenAIConfigured`
  // reads outward, returning a Bool.
  let openAIApiKey : { var value : ?Text };

  // --- Core domain API -----------------------------------------------------
  include CoreApi(
    workflowsByOwner,
    preferencesByOwner,
    historyByOwner,
    workflowIdsByOwner,
    historyIdsByOwner,
    accessControlState,
    openAIApiKey,
  );

  // --- Data Intelligence (OQL) ---------------------------------------------
  // Expose the per-user stored collections so the Data Intelligence agent can
  // answer natural-language questions over them. Each entity is scoped per
  // user: a signed-in caller reads only their own rows.

  // Sample owner principal used only to seed schema discovery for empty
  // collections at build time; the value is ignored at query time.
  transient let anyP = Principal.fromText("aaaaa-aa");

  // Flattened workflow iterator scoped to an owner. scopedIter(?p) yields only
  // p's workflows; scopedIter(null) yields all workflows (for schema seeding).
  func workflowIter(maybeOwner : ?Common.Owner) : Iter.Iter<Core.Workflow> {
    switch (maybeOwner) {
      case (?owner) {
        switch (workflowsByOwner.get(owner)) {
          case (?list) { list.values() };
          case null { List.empty<Core.Workflow>().values() };
        };
      };
      case null {
        // All owners' workflows, concatenated for schema seeding.
        workflowsByOwner.entries().flatMap(
          func(_, list) = list.values(),
        );
      };
    };
  };

  // Flattened history iterator scoped to an owner.
  func historyIter(maybeOwner : ?Common.Owner) : Iter.Iter<Core.HistoryEntry> {
    switch (maybeOwner) {
      case (?owner) {
        switch (historyByOwner.get(owner)) {
          case (?list) { list.values() };
          case null { List.empty<Core.HistoryEntry>().values() };
        };
      };
      case null {
        historyByOwner.entries().flatMap(
          func(_, list) = list.values(),
        );
      };
    };
  };

  // Flattened preferences iterator scoped to an owner. Each owner has at most
  // one Preferences record, so scopedIter(?p) yields zero or one row and
  // scopedIter(null) yields every owner's record (for schema seeding).
  func preferencesIter(maybeOwner : ?Common.Owner) : Iter.Iter<(Common.Owner, Core.Preferences)> {
    switch (maybeOwner) {
      case (?owner) {
        switch (preferencesByOwner.get(owner)) {
          case (?prefs) { Iter.singleton((owner, prefs)) };
          case null { Iter.empty<(Common.Owner, Core.Preferences)>() };
        };
      };
      case null {
        preferencesByOwner.entries();
      };
    };
  };

  include Expose({
    entities = [
      // Per-user workflows: each signed-in user reads only their own.
      // Manual mode is required because `tags : [Text]` is a collection
      // field with no built-in _toRow; it is collapsed to a comma-joined
      // Text payload so the row stays flat and queryable.
      OQL.Entity.manual<Core.Workflow>("workflow", func () = workflowIter(null), "Workflow", "id")
        .payload("id", func wf = wf.id)
        .payload("owner", func wf = wf.owner)
        .payload("name", func wf = wf.name)
        .payload("description", func wf = wf.description)
        .payload("tags", func wf = wf.tags.vals().join(", "))
        .payload("planText", func wf = wf.planText)
        .payload("favorite", func wf = wf.favorite)
        .payload("createdAt", func wf = wf.createdAt)
        .payload("updatedAt", func wf = wf.updatedAt)
        .sample({
          id = 0;
          owner = anyP;
          name = "";
          description = "";
          tags = [];
          planText = "";
          favorite = false;
          createdAt = 0;
          updatedAt = 0;
        })
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      // Per-user history entries: each signed-in user reads only their own.
      OQL.Entity.newScoped<Core.HistoryEntry>("historyEntry", historyIter, "HistoryEntry", "id")
        .sample({
          id = 0;
          owner = anyP;
          goal = "";
          planText = "";
          createdAt = 0;
        })
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
      // Per-user preferences: one record per owner. Manual mode is required
      // because `dApps : [PreferredDApp]` and `rules : [Rule]` are collection
      // fields with no built-in _toRow. The owner is promoted from the Map
      // key (it is not a field of Preferences) and tagged as the owner column
      // so .scopedPerUser() can enforce per-user isolation. The dApps and
      // rules collections are collapsed to comma-joined Text payloads (and
      // their counts exposed as Nat columns) so the row stays flat and
      // queryable. "owner" is the primary key since each owner has at most
      // one preferences record.
      OQL.Entity.manual<(Common.Owner, Core.Preferences)>("preferences", func () = preferencesIter(null), "Preferences", "owner")
        .payload("owner", func((owner, _)) = owner)
        .payload("dApps", func((_, prefs)) = prefs.dApps.vals().map(func d = d.friendlyName).join(", "))
        .payload("dAppCount", func((_, prefs)) = prefs.dApps.size())
        .payload("rules", func((_, prefs)) = prefs.rules.vals().map(func r = r.text).join(", "))
        .payload("ruleCount", func((_, prefs)) = prefs.rules.size())
        .payload("notes", func((_, prefs)) = prefs.notes)
        .sample((anyP, { dApps = []; rules = []; notes = "" }))
        .ownedBy("owner")
        .scopedPerUser()
        .build(),
    ];
  });
};
