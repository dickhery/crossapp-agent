import Array "mo:core/Array";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Common "../types/common";
import Core "../types/core";
import OpenAI "./openai";

// Domain logic for the CrossApp Agent core.
//
// All functions are pure with respect to the injected state containers: they
// read and mutate the per-owner Maps/Lists passed in by the mixin layer, which
// owns authorization. Each function assumes the caller has already been
// verified as the data owner.
module {

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

  // The system prompt instructs the model to produce a Claude + ICP MCP
  // optimized plan: numbered steps, explicit canister IDs, MCP tool-call
  // hints, and step-by-step instructions ready to paste into Claude.
  func planSystemPrompt() : Text {
    "You are a planning assistant for the Internet Computer. Given a user's " #
    "goal, their preferred dApps and canister IDs, their personal rules, and " #
    "the conversation so far, produce a clean, numbered, executable plan " #
    "optimized for Claude with the official ICP MCP server connected.\n\n" #
    "Output requirements:\n" #
    "1. Numbered steps (1., 2., 3., ...), each a single concrete action.\n" #
    "2. Each step that touches a canister MUST reference the canister by its " #
    "explicit canister ID (the principal as text), not just a friendly name.\n" #
    "3. Where a step maps to an ICP MCP tool, include a short MCP tool-call " #
    "hint in parentheses, e.g. (MCP: icp.call_canister method=... canister=...).\n" #
    "4. Include preflight checks where the user's rules demand them (e.g. " #
    "cycles checks, balance thresholds).\n" #
    "5. Keep the plan copy-paste ready: no markdown fences, no commentary " #
    "before or after the numbered list, just the steps.\n" #
    "6. Respect every personal rule the user provided; if a rule conflicts " #
    "with the goal, add a step that surfaces the conflict rather than " #
    "silently ignoring the rule."
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
  // The generated plan is recorded in the caller's history before returning.
  public func generatePlan(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    historyByOwner : Map.Map<Common.Owner, List.List<Core.HistoryEntry>>,
    historyIdsByOwner : Map.Map<Common.Owner, { var next : Common.HistoryId }>,
    openAIApiKey : { var value : ?Text },
    owner : Common.Owner,
    goal : Text,
    conversation : Core.Conversation,
  ) : async Core.PlanResult {
    let ?key = openAIApiKey.value else {
      Runtime.trap("OpenAI is not configured");
    };
    let prefs = resolvePreferences(preferencesByOwner, owner);
    let userPrompt = buildGenerateUserPrompt(goal, prefs, conversation);
    let planText = await* OpenAI.runChatCompletion(
      OpenAI.configForKey(key),
      planSystemPrompt(),
      userPrompt,
    );
    // Record the generated plan in the caller's history.
    ignore recordHistory(historyByOwner, historyIdsByOwner, owner, goal, planText);
    { planText };
  };

  // Refines an existing plan based on a follow-up instruction, regenerating
  // the plan via the external AI model. Refinements are not recorded as new
  // history entries (only initial generations are); the caller can save the
  // refined plan as a workflow if desired.
  public func refinePlan(
    preferencesByOwner : Map.Map<Common.Owner, Core.Preferences>,
    openAIApiKey : { var value : ?Text },
    owner : Common.Owner,
    instruction : Text,
    conversation : Core.Conversation,
  ) : async Core.PlanResult {
    let ?key = openAIApiKey.value else {
      Runtime.trap("OpenAI is not configured");
    };
    let prefs = resolvePreferences(preferencesByOwner, owner);
    let userPrompt = buildRefineUserPrompt(instruction, prefs, conversation);
    let planText = await* OpenAI.runChatCompletion(
      OpenAI.configForKey(key),
      planSystemPrompt(),
      userPrompt,
    );
    { planText };
  };
};
