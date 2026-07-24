import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Common "../types/common";
import Core "../types/core";
import OfflinePlan "./offline-plan";
import OpenAI "./openai";

// Domain logic for the CrossApp Agent core.
//
// All functions are pure with respect to the injected state containers: they
// read and mutate the per-owner Maps/Lists passed in by the mixin layer, which
// owns authorization. Each function assumes the caller has already been
// verified as the data owner.
//
// Cycle-conscious defaults: per-user history is capped, conversation context
// sent to the model is truncated, and plan generation falls back to a local
// template when OpenAI is not configured (no HTTPS outcall).
module {
  // Soft caps to keep heap growth and outcall payloads bounded.
  let MAX_HISTORY_PER_OWNER : Nat = 40;
  let MAX_CONVERSATION_MESSAGES : Nat = 12;
  let MAX_GOAL_CHARS : Nat = 2_000;
  let MAX_MESSAGE_CHARS : Nat = 4_000;
  let MAX_DAPPS : Nat = 40;
  let MAX_RULES : Nat = 40;
  let MAX_NOTES_CHARS : Nat = 4_000;
  let MAX_WORKFLOWS_PER_OWNER : Nat = 80;

  // =========================================================================
  // Internal helpers
  // =========================================================================

  // Returns the owner's workflow list, creating an empty one on first access.
  func ensureWorkflowList(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
  ) : List.List<Core.Workflow> {
    switch (workflowsByOwner.get(owner)) {
      case (?list) { list };
      case null {
        let list = List.empty<Core.Workflow>();
        workflowsByOwner.add(owner, list);
        list;
      };
    };
  };

  // Returns the owner's history list, creating an empty one on first access.
  func ensureHistoryList(
    historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
    owner : Common.Owner,
  ) : List.List<Core.HistoryEntry> {
    switch (historyByOwner.get(owner)) {
      case (?list) { list };
      case null {
        let list = List.empty<Core.HistoryEntry>();
        historyByOwner.add(owner, list);
        list;
      };
    };
  };

  // Returns the owner's next-workflow-id counter, creating one starting at 1
  // on first access.
  func ensureWorkflowIdCounter(
    workflowIdsByOwner : Map.Map<Common.Owner, { var next : Common.WorkflowId }>,
    owner : Common.Owner,
  ) : { var next : Common.WorkflowId } {
    switch (workflowIdsByOwner.get(owner)) {
      case (?c) { c };
      case null {
        let c = { var next = 1 };
        workflowIdsByOwner.add(owner, c);
        c;
      };
    };
  };

  // Returns the owner's next-history-id counter, creating one starting at 1
  // on first access.
  func ensureHistoryIdCounter(
    historyIdsByOwner : Map.Map<Common.Owner, { var next : Common.HistoryId }>,
    owner : Common.Owner,
  ) : { var next : Common.HistoryId } {
    switch (historyIdsByOwner.get(owner)) {
      case (?c) { c };
      case null {
        let c = { var next = 1 };
        historyIdsByOwner.add(owner, c);
        c;
      };
    };
  };

  // Finds a workflow by id within the owner's list, returning the matched
  // workflow and the list with that workflow removed (used for update/delete).
  func takeWorkflow(
    list : List.List<Core.Workflow>,
    id : Common.WorkflowId,
  ) : (?Core.Workflow, List.List<Core.Workflow>) {
    let matching = list.filter(func(wf : Core.Workflow) : Bool { wf.id == id });
    let matched = switch (matching.first()) {
      case (?wf) { ?wf };
      case null { null };
    };
    let remaining = list.filter(func(wf : Core.Workflow) : Bool { wf.id != id });
    (matched, remaining);
  };

  // Finds a history entry by id within the owner's list.
  func findHistoryEntry(
    list : List.List<Core.HistoryEntry>,
    id : Common.HistoryId,
  ) : ?Core.HistoryEntry {
    list.find(func(entry : Core.HistoryEntry) : Bool { entry.id == id });
  };

  // Removes a history entry by id, returning the new list.
  func removeHistoryEntry(
    list : List.List<Core.HistoryEntry>,
    id : Common.HistoryId,
  ) : List.List<Core.HistoryEntry> {
    list.filter(func(entry : Core.HistoryEntry) : Bool { entry.id != id });
  };

  // Case-insensitive substring match used by searchWorkflows.
  func matchesSearch(wf : Core.Workflow, searchText : Text) : Bool {
    if (searchText.isEmpty()) { return true };
    let needle = searchText.toLower();
    if (wf.name.toLower().contains(#text(needle))) { return true };
    if (wf.description.toLower().contains(#text(needle))) { return true };
    for (tag in wf.tags.vals()) {
      if (tag.toLower().contains(#text(needle))) { return true };
    };
    false;
  };

  // =========================================================================
  // Workflows
  // =========================================================================

  public func listWorkflows(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
  ) : [Core.Workflow] {
    switch (workflowsByOwner.get(owner)) {
      case (?list) { list.toArray() };
      case null { [] };
    };
  };

  public func getWorkflow(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
    id : Common.WorkflowId,
  ) : ?Core.Workflow {
    switch (workflowsByOwner.get(owner)) {
      case (?list) {
        list.find(func(wf : Core.Workflow) : Bool { wf.id == id });
      };
      case null { null };
    };
  };

  public func createWorkflow(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    workflowIdsByOwner : Map.Map<Common.Owner, { var next : Common.WorkflowId }>,
    owner : Common.Owner,
    name : Text,
    description : Text,
    tags : [Text],
    planText : Text,
    favorite : Bool,
  ) : Core.Workflow {
    let list = ensureWorkflowList(workflowsByOwner, owner);
    if (list.size() >= MAX_WORKFLOWS_PER_OWNER) {
      Runtime.trap("Workflow limit reached (" # Nat.toText(MAX_WORKFLOWS_PER_OWNER) # "). Delete unused workflows first.");
    };
    let counter = ensureWorkflowIdCounter(workflowIdsByOwner, owner);
    let id = counter.next;
    counter.next += 1;
    let now = Time.now();
    let wf : Core.Workflow = {
      id;
      owner;
      name;
      description;
      tags;
      planText;
      favorite;
      createdAt = now;
      updatedAt = now;
    };
    list.add(wf);
    wf;
  };

  public func updateWorkflow(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
    workflow : Core.Workflow,
  ) : ?Core.Workflow {
    switch (workflowsByOwner.get(owner)) {
      case (?list) {
        let (matched, remaining) = takeWorkflow(list, workflow.id);
        switch (matched) {
          case (?existing) {
            // Preserve owner and createdAt; apply everything else from input.
            let updated : Core.Workflow = {
              workflow with
              owner = existing.owner;
              createdAt = existing.createdAt;
              updatedAt = Time.now();
            };
            workflowsByOwner.add(owner, remaining);
            remaining.add(updated);
            ?updated;
          };
          case null { null };
        };
      };
      case null { null };
    };
  };

  public func duplicateWorkflow(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    workflowIdsByOwner : Map.Map<Common.Owner, { var next : Common.WorkflowId }>,
    owner : Common.Owner,
    id : Common.WorkflowId,
  ) : ?Core.Workflow {
    switch (getWorkflow(workflowsByOwner, owner, id)) {
      case (?source) {
        let list = ensureWorkflowList(workflowsByOwner, owner);
        let counter = ensureWorkflowIdCounter(workflowIdsByOwner, owner);
        let newId = counter.next;
        counter.next += 1;
        let now = Time.now();
        let copy : Core.Workflow = {
          id = newId;
          owner;
          name = source.name # " (copy)";
          description = source.description;
          tags = source.tags;
          planText = source.planText;
          favorite = false;
          createdAt = now;
          updatedAt = now;
        };
        list.add(copy);
        ?copy;
      };
      case null { null };
    };
  };

  public func deleteWorkflow(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
    id : Common.WorkflowId,
  ) : Bool {
    switch (workflowsByOwner.get(owner)) {
      case (?list) {
        let (matched, remaining) = takeWorkflow(list, id);
        switch (matched) {
          case (?_) {
            workflowsByOwner.add(owner, remaining);
            true;
          };
          case null { false };
        };
      };
      case null { false };
    };
  };

  public func toggleFavorite(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
    id : Common.WorkflowId,
  ) : ?Core.Workflow {
    switch (workflowsByOwner.get(owner)) {
      case (?list) {
        let (matched, remaining) = takeWorkflow(list, id);
        switch (matched) {
          case (?existing) {
            let updated : Core.Workflow = {
              existing with
              favorite = not existing.favorite;
              updatedAt = Time.now();
            };
            workflowsByOwner.add(owner, remaining);
            remaining.add(updated);
            ?updated;
          };
          case null { null };
        };
      };
      case null { null };
    };
  };

  public func searchWorkflows(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
    searchText : Text,
  ) : [Core.Workflow] {
    switch (workflowsByOwner.get(owner)) {
      case (?list) {
        list.filter(func(wf : Core.Workflow) : Bool { matchesSearch(wf, searchText) }).toArray();
      };
      case null { [] };
    };
  };

  public func exportWorkflowMarkdown(
    workflowsByOwner : Map.Map<Common.Owner, List.List<Core.Workflow>>,
    owner : Common.Owner,
    id : Common.WorkflowId,
  ) : ?Text {
    switch (getWorkflow(workflowsByOwner, owner, id)) {
      case (?wf) {
        let tagsLine = if (wf.tags.size() == 0) {
          ""
        } else {
          "\n\n**Tags:** " # wf.tags.vals().join(", ")
        };
        let favoriteLine = if (wf.favorite) { "\n\n*Favorite*" } else { "" };
        let md =
          "# " # wf.name #
          "\n\n" # wf.description #
          tagsLine #
          favoriteLine #
          "\n\n## Plan\n\n" # wf.planText;
        ?md;
      };
      case null { null };
    };
  };

  // =========================================================================
  // Preferences
  // =========================================================================

  // Returns the owner's preferences, or a default empty record if none exist.
  func ensurePreferences(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
  ) : Core.Preferences {
    switch (preferencesByOwner.get(owner)) {
      case (?prefs) { prefs };
      case null {
        let prefs : Core.Preferences = {
          dApps = [];
          rules = [];
          notes = "";
        };
        preferencesByOwner.add(owner, prefs);
        prefs;
      };
    };
  };

  // Computes the next dApp id within a preferences record.
  func nextDAppId(prefs : Core.Preferences) : Nat {
    var max = 0;
    for (d in prefs.dApps.vals()) {
      if (d.id > max) { max := d.id };
    };
    max + 1;
  };

  // Computes the next rule id within a preferences record.
  func nextRuleId(prefs : Core.Preferences) : Nat {
    var max = 0;
    for (r in prefs.rules.vals()) {
      if (r.id > max) { max := r.id };
    };
    max + 1;
  };

  public func getPreferences(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
  ) : ?Core.Preferences {
    preferencesByOwner.get(owner);
  };

  public func savePreferences(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    prefs : Core.Preferences,
  ) : Core.Preferences {
    preferencesByOwner.add(owner, prefs);
    prefs;
  };

  public func addDApp(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    friendlyName : Text,
    canisterId : Text,
  ) : Core.Preferences {
    let prefs = ensurePreferences(preferencesByOwner, owner);
    if (prefs.dApps.size() >= MAX_DAPPS) {
      Runtime.trap("Preferred dApp limit reached (" # Nat.toText(MAX_DAPPS) # ")");
    };
    let id = nextDAppId(prefs);
    let dApp : Core.PreferredDApp = { id; friendlyName; canisterId };
    let updated : Core.Preferences = {
      prefs with
      dApps = prefs.dApps.concat([dApp]);
    };
    preferencesByOwner.add(owner, updated);
    updated;
  };

  public func updateDApp(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    dApp : Core.PreferredDApp,
  ) : Core.Preferences {
    let prefs = ensurePreferences(preferencesByOwner, owner);
    let newDApps = prefs.dApps.map(func(d : Core.PreferredDApp) : Core.PreferredDApp {
      if (d.id == dApp.id) { dApp } else { d };
    });
    let updated : Core.Preferences = { prefs with dApps = newDApps };
    preferencesByOwner.add(owner, updated);
    updated;
  };

  public func deleteDApp(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    id : Nat,
  ) : Core.Preferences {
    let prefs = ensurePreferences(preferencesByOwner, owner);
    let newDApps = prefs.dApps.filter(func(d : Core.PreferredDApp) : Bool { d.id != id });
    let updated : Core.Preferences = { prefs with dApps = newDApps };
    preferencesByOwner.add(owner, updated);
    updated;
  };

  public func addRule(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    text : Text,
  ) : Core.Preferences {
    let prefs = ensurePreferences(preferencesByOwner, owner);
    if (prefs.rules.size() >= MAX_RULES) {
      Runtime.trap("Rule limit reached (" # Nat.toText(MAX_RULES) # ")");
    };
    let id = nextRuleId(prefs);
    let rule : Core.Rule = { id; text };
    let updated : Core.Preferences = {
      prefs with
      rules = prefs.rules.concat([rule]);
    };
    preferencesByOwner.add(owner, updated);
    updated;
  };

  public func updateRule(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    rule : Core.Rule,
  ) : Core.Preferences {
    let prefs = ensurePreferences(preferencesByOwner, owner);
    let newRules = prefs.rules.map(func(r : Core.Rule) : Core.Rule {
      if (r.id == rule.id) { rule } else { r };
    });
    let updated : Core.Preferences = { prefs with rules = newRules };
    preferencesByOwner.add(owner, updated);
    updated;
  };

  public func deleteRule(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    id : Nat,
  ) : Core.Preferences {
    let prefs = ensurePreferences(preferencesByOwner, owner);
    let newRules = prefs.rules.filter(func(r : Core.Rule) : Bool { r.id != id });
    let updated : Core.Preferences = { prefs with rules = newRules };
    preferencesByOwner.add(owner, updated);
    updated;
  };

  public func setNotes(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
    notes : Text,
  ) : Core.Preferences {
    if (notes.size() > MAX_NOTES_CHARS) {
      Runtime.trap("Notes exceed " # Nat.toText(MAX_NOTES_CHARS) # " characters");
    };
    let prefs = ensurePreferences(preferencesByOwner, owner);
    let updated : Core.Preferences = { prefs with notes };
    preferencesByOwner.add(owner, updated);
    updated;
  };

  // =========================================================================
  // History
  // =========================================================================

  public func listHistory(
    historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
    owner : Common.Owner,
  ) : [Core.HistoryEntry] {
    switch (historyByOwner.get(owner)) {
      // Most recent first: entries are appended at the end, so reverse.
      case (?list) { list.reverse().toArray() };
      case null { [] };
    };
  };

  public func getHistoryEntry(
    historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
    owner : Common.Owner,
    id : Common.HistoryId,
  ) : ?Core.HistoryEntry {
    switch (historyByOwner.get(owner)) {
      case (?list) { findHistoryEntry(list, id) };
      case null { null };
    };
  };

  // Drop oldest history rows when the per-owner cap is exceeded. Entries are
  // appended at the end, so index 0 is the oldest. Rebuild in place because
  // mo:core List has no remove-at-index.
  func trimHistory(list : List.List<Core.HistoryEntry>) {
    let n = list.size();
    if (n <= MAX_HISTORY_PER_OWNER) { return };
    let drop = n - MAX_HISTORY_PER_OWNER;
    var i = 0;
    let kept = List.empty<Core.HistoryEntry>();
    for (entry in list.values()) {
      if (i >= drop) { kept.add(entry) };
      i += 1;
    };
    list.clear();
    for (entry in kept.values()) {
      list.add(entry);
    };
  };

  public func recordHistory(
    historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
    historyIdsByOwner : Map.Map<Common.Owner, { var next : Common.HistoryId }>,
    owner : Common.Owner,
    goal : Text,
    planText : Text,
  ) : Core.HistoryEntry {
    let list = ensureHistoryList(historyByOwner, owner);
    let counter = ensureHistoryIdCounter(historyIdsByOwner, owner);
    let id = counter.next;
    counter.next += 1;
    let entry : Core.HistoryEntry = {
      id;
      owner;
      goal;
      planText;
      createdAt = Time.now();
    };
    list.add(entry);
    trimHistory(list);
    entry;
  };

  public func deleteHistoryEntry(
    historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
    owner : Common.Owner,
    id : Common.HistoryId,
  ) : Bool {
    switch (historyByOwner.get(owner)) {
      case (?list) {
        let existed = findHistoryEntry(list, id);
        switch (existed) {
          case (?_) {
            let remaining = removeHistoryEntry(list, id);
            historyByOwner.add(owner, remaining);
            true;
          };
          case null { false };
        };
      };
      case null { false };
    };
  };

  // =========================================================================
  // Plan generation
  //
  // These call an external AI model via the openai-client HTTP outcall glue
  // in lib/openai.mo. The system prompt is tuned for Claude + the official
  // ICP MCP server: explicit canister IDs, MCP tool-call hints, and
  // step-by-step instructions. The user's stored preferences (dApps, rules,
  // notes) and the active conversation are folded into the user prompt so the
  // model can ground its plan in the user's environment and constraints.
  // =========================================================================

  // System prompt tuned for the official Internet Computer MCP beta server
  // (https://mcp.beta.id.ai/). Tool names must match that server exactly —
  // agents only speak textual Candid; the server encodes/decodes.
  func planSystemPrompt() : Text {
    "You are a planning assistant for the True Cross-App Personal Agent on the " #
    "Internet Computer. Users will paste your plan into Grok, Claude, or ChatGPT " #
    "with the official IC MCP server connected (URL: " # OfflinePlan.MCP_URL # "). " #
    "The agent acts under the user's Internet Identity with only the access " #
    "they grant.\n\n" #
    "MCP setup the user already (or will) complete:\n" #
    "- Trust " # OfflinePlan.MCP_URL # " under Internet Identity → Trusted MCP servers.\n" #
    "- Add the same URL as a custom MCP connector (Grok: grok.com/connectors → Custom; " #
    "Claude: Customize → Connectors; ChatGPT: Apps/Connectors when plan allows).\n" #
    "- Authorize Actions & questions (or questions-only for research).\n\n" #
    "Use ONLY these real MCP tool names in hints:\n" #
    "Discovery: discover_app_canisters, icp_find_canister_by_name, icp_find_app_by_name, " #
    "icp_lookup_canister_info_by_id, get_canister_candid, get_canister_api_doc.\n" #
    "Identity: list_app_accounts, get_app_principal, resolve_app.\n" #
    "OQL: icp_oql_guide, get_canister_oql_schema, canister_query (when oql:true).\n" #
    "Actions: canister_query, canister_update_call, icp_cycles_balance, " #
    "icp_create_canister, icp_top_up_canister, icp_install_code, icp_canister_status, " #
    "icp_update_canister_settings, icp_start_canister, icp_stop_canister, " #
    "icp_uninstall_code, icp_delete_canister.\n" #
    "Skills: icp_list_skills, icp_get_skill.\n\n" #
    "Output requirements:\n" #
    "1. Numbered steps (1., 2., 3., ...), each a single concrete action.\n" #
    "2. Reference canisters by explicit principal text when known; otherwise " #
    "start with a discovery tool step.\n" #
    "3. Include MCP tool-call hints like (MCP: canister_query) or " #
    "(MCP: canister_update_call) on relevant steps.\n" #
    "4. Prefer read-only tools before updates. Check icp_cycles_balance before " #
    "create/top-up. Stop before delete.\n" #
    "5. Respect every personal rule; if a rule conflicts with the goal, add a " #
    "step that surfaces the conflict instead of ignoring it.\n" #
    "6. Copy-paste ready: no markdown fences, no preamble/epilogue — only the " #
    "numbered steps (a one-line Goal: header is allowed).\n" #
    "7. Be cycle-conscious: avoid redundant status checks, batch discovery, " #
    "and never suggest unbounded loops of update calls."
  };

  // Truncate free text so HTTPS outcall bodies stay small (cycles + latency).
  func truncate(text : Text, maxChars : Nat) : Text {
    if (text.size() <= maxChars) { text } else {
      // Text is UTF-8; slice by bytes via chars for safety within limit.
      var acc = "";
      var n = 0;
      label l for (c in text.chars()) {
        if (n >= maxChars) { break l };
        acc #= Text.fromChar(c);
        n += 1;
      };
      acc # "…";
    };
  };

  // Keep only the most recent conversation turns and bound each message body.
  func slimConversation(conversation : Core.Conversation) : Core.Conversation {
    let msgs = conversation.messages;
    let start = if (msgs.size() > MAX_CONVERSATION_MESSAGES) {
      msgs.size() - MAX_CONVERSATION_MESSAGES
    } else { 0 };
    var slim : [Core.ChatMessage] = [];
    var i = start;
    while (i < msgs.size()) {
      let m = msgs[i];
      slim := slim.concat([{
        m with
        content = truncate(m.content, MAX_MESSAGE_CHARS);
      }]);
      i += 1;
    };
    { messages = slim };
  };

  // Renders the user's preferences (dApps, rules, notes) as a compact text
  // block for inclusion in the user prompt. Empty sections are omitted so the
  // prompt stays focused.
  func renderPreferences(prefs : Core.Preferences) : Text {
    var parts : [Text] = [];
    if (prefs.dApps.size() > 0) {
      let dAppLines = prefs.dApps.map(
        func(d : Core.PreferredDApp) : Text {
          "  - " # d.friendlyName # " (canister id: " # d.canisterId # ")"
        },
      );
      parts := parts.concat(["Preferred dApps / canister IDs:"].concat(dAppLines));
    };
    if (prefs.rules.size() > 0) {
      let ruleLines = prefs.rules.map(
        func(r : Core.Rule) : Text { "  - " # r.text },
      );
      parts := parts.concat(["Personal rules (MUST be respected):"].concat(ruleLines));
    };
    if (not prefs.notes.isEmpty()) {
      parts := parts.concat(["Persistent notes:"].concat(["  " # prefs.notes]));
    };
    parts.vals().join("\n");
  };

  // Renders the conversation history as a transcript the model can follow.
  // Each line is prefixed with the role so the model can distinguish user
  // turns from prior assistant plan drafts.
  func renderConversation(conversation : Core.Conversation) : Text {
    if (conversation.messages.size() == 0) { return "" };
    let lines = conversation.messages.map(
      func(m : Core.ChatMessage) : Text {
        let role = switch (m.role) {
          case (#user) { "User" };
          case (#assistant) { "Assistant" };
        };
        role # ": " # m.content
      },
    );
    lines.vals().join("\n");
  };

  // Builds the user prompt for an initial plan generation: goal, preferences,
  // and conversation context.
  func buildGenerateUserPrompt(
    goal : Text,
    prefs : Core.Preferences,
    conversation : Core.Conversation,
  ) : Text {
    var sections : [Text] = [];
    sections := sections.concat(["Goal: " # goal]);
    let prefsText = renderPreferences(prefs);
    if (not prefsText.isEmpty()) {
      sections := sections.concat([prefsText]);
    };
    let convoText = renderConversation(conversation);
    if (not convoText.isEmpty()) {
      sections := sections.concat(["Conversation so far:", convoText]);
    };
    sections := sections.concat(
      ["Produce the numbered plan now."],
    );
    sections.vals().join("\n\n");
  };

  // Builds the user prompt for a plan refinement: the refinement instruction,
  // the current conversation/plan context, and the user's preferences.
  func buildRefineUserPrompt(
    instruction : Text,
    prefs : Core.Preferences,
    conversation : Core.Conversation,
  ) : Text {
    var sections : [Text] = [];
    sections := sections.concat(["Refinement instruction: " # instruction]);
    let prefsText = renderPreferences(prefs);
    if (not prefsText.isEmpty()) {
      sections := sections.concat([prefsText]);
    };
    let convoText = renderConversation(conversation);
    if (not convoText.isEmpty()) {
      sections := sections.concat(["Current conversation / plan context:", convoText]);
    };
    sections := sections.concat(
      ["Produce the updated numbered plan now, incorporating the refinement."],
    );
    sections.vals().join("\n\n");
  };

  // Resolves the caller's preferences (defaulting to an empty record when none
  // are stored yet) so the prompt always has a well-formed preferences block.
  func resolvePreferences(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    owner : Common.Owner,
  ) : Core.Preferences {
    switch (preferencesByOwner.get(owner)) {
      case (?prefs) { prefs };
      case null {
        { dApps = []; rules = []; notes = "" };
      };
    };
  };

  // Generates a structured, numbered plan from a natural-language goal. The
  // caller's preferences and conversation context are folded into the prompt.
  // Uses OpenAI when configured; otherwise returns a deterministic MCP-aware
  // template (no HTTPS outcall — conserves cycles). Always records history.
  public func generatePlan(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
    historyIdsByOwner : Map.Map<Common.Owner, { var next : Common.HistoryId }>,
    openAIApiKey : { var value : ?Text },
    owner : Common.Owner,
    goal : Text,
    conversation : Core.Conversation,
  ) : async Core.PlanResult {
    if (goal.isEmpty()) {
      Runtime.trap("Goal must not be empty");
    };
    let safeGoal = truncate(goal, MAX_GOAL_CHARS);
    let prefs = resolvePreferences(preferencesByOwner, owner);
    let slim = slimConversation(conversation);
    let planText = switch (openAIApiKey.value) {
      case (?key) {
        let userPrompt = buildGenerateUserPrompt(safeGoal, prefs, slim);
        await* OpenAI.runChatCompletion(
          OpenAI.configForKey(key),
          planSystemPrompt(),
          userPrompt,
        );
      };
      case null {
        OfflinePlan.build(safeGoal, prefs);
      };
    };
    ignore recordHistory(historyByOwner, historyIdsByOwner, owner, safeGoal, planText);
    { planText };
  };

  // Refines an existing plan based on a follow-up instruction. Falls back to
  // an offline template when OpenAI is not configured (no outcall).
  public func refinePlan(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    openAIApiKey : { var value : ?Text },
    owner : Common.Owner,
    instruction : Text,
    conversation : Core.Conversation,
  ) : async Core.PlanResult {
    if (instruction.isEmpty()) {
      Runtime.trap("Instruction must not be empty");
    };
    let safeInstruction = truncate(instruction, MAX_GOAL_CHARS);
    let prefs = resolvePreferences(preferencesByOwner, owner);
    let slim = slimConversation(conversation);
    let planText = switch (openAIApiKey.value) {
      case (?key) {
        let userPrompt = buildRefineUserPrompt(safeInstruction, prefs, slim);
        await* OpenAI.runChatCompletion(
          OpenAI.configForKey(key),
          planSystemPrompt(),
          userPrompt,
        );
      };
      case null {
        // Re-plan from the instruction + latest context offline.
        let goalFromCtx = if (slim.messages.size() == 0) {
          safeInstruction
        } else {
          "Refine: " # safeInstruction # "\nPrior context: " #
          truncate(slim.messages[slim.messages.size() - 1].content, 800)
        };
        OfflinePlan.build(goalFromCtx, prefs);
      };
    };
    { planText };
  };
};
