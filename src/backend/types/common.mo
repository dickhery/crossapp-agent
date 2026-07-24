module {
  // Cross-cutting types shared across all domains of the CrossApp Agent backend.

  // The authenticated Internet Identity principal owning a record.
  public type Owner = Principal;

  // Nanoseconds since epoch (Time.now() returns Int).
  public type Timestamp = Int;

  // A workflow's stable identifier, unique per owner.
  public type WorkflowId = Nat;

  // A history entry's stable identifier, unique per owner.
  public type HistoryId = Nat;

  // Role of a chat message within a conversation.
  public type ChatRole = {
    #user;
    #assistant;
  };
};
