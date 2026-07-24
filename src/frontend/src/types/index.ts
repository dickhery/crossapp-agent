// Shared domain types — mirror backend.d.ts Candid types.
// Re-export generated backend types so the rest of the app imports from a
// single domain module. Generated bindings are the source of truth; this file
// only adds ergonomic aliases and frontend-only view models.

import type {
  ChatMessage,
  ChatRole,
  Conversation,
  HistoryEntry,
  HistoryId,
  Owner,
  PlanResult,
  Preferences,
  PreferredDApp,
  Rule,
  Timestamp,
  Workflow,
  WorkflowId,
} from "@/backend";

export type {
  Workflow,
  Preferences,
  HistoryEntry,
  ChatMessage,
  Conversation,
  PlanResult,
  ChatRole,
  PreferredDApp,
  Rule,
  WorkflowId,
  HistoryId,
  Timestamp,
  Owner,
};

// Frontend-only view models / convenience aliases.

export type WorkflowSummary = Pick<
  Workflow,
  "id" | "name" | "description" | "favorite" | "updatedAt"
>;

export type HistorySummary = Pick<HistoryEntry, "id" | "goal" | "createdAt">;

export type ChatTurn = {
  role: ChatRole;
  content: string;
  timestamp?: Timestamp;
};

export const isUserTurn = (turn: ChatTurn): boolean => turn.role === "user";
export const isAssistantTurn = (turn: ChatTurn): boolean =>
  turn.role === "assistant";
