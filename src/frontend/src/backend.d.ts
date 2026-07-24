import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Conversation {
    messages: Array<ChatMessage>;
}
export type Timestamp = bigint;
export interface HistoryEntry {
    id: HistoryId;
    owner: Owner;
    goal: string;
    createdAt: Timestamp;
    planText: string;
}
export interface Preferences {
    notes: string;
    dApps: Array<PreferredDApp>;
    rules: Array<Rule>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface PlanResult {
    planText: string;
}
export interface Rule {
    id: bigint;
    text: string;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface PreferredDApp {
    id: bigint;
    friendlyName: string;
    canisterId: string;
}
export type HistoryId = bigint;
export interface Cell {
    value: Value;
    name: string;
}
export interface ChatMessage {
    content: string;
    role: ChatRole;
    timestamp: Timestamp;
}
export type Owner = Principal;
export type WorkflowId = bigint;
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface Workflow {
    id: WorkflowId;
    owner: Owner;
    name: string;
    createdAt: Timestamp;
    tags: Array<string>;
    description: string;
    updatedAt: Timestamp;
    planText: string;
    favorite: boolean;
}
export enum ChatRole {
    user = "user",
    assistant = "assistant"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addDApp(friendlyName: string, canisterId: string): Promise<Preferences>;
    addRule(text: string): Promise<Preferences>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createWorkflow(name: string, description: string, tags: Array<string>, planText: string, favorite: boolean): Promise<Workflow>;
    deleteDApp(id: bigint): Promise<Preferences>;
    deleteHistoryEntry(id: HistoryId): Promise<boolean>;
    deleteRule(id: bigint): Promise<Preferences>;
    deleteWorkflow(id: WorkflowId): Promise<boolean>;
    duplicateWorkflow(id: WorkflowId): Promise<Workflow | null>;
    execute(qJson: string): Promise<Result>;
    exportWorkflowMarkdown(id: WorkflowId): Promise<string | null>;
    generatePlan(goal: string, conversation: Conversation): Promise<PlanResult>;
    getCallerUserRole(): Promise<UserRole>;
    getHistoryEntry(id: HistoryId): Promise<HistoryEntry | null>;
    getPreferences(): Promise<Preferences | null>;
    getWorkflow(id: WorkflowId): Promise<Workflow | null>;
    isCallerAdmin(): Promise<boolean>;
    isOpenAIConfigured(): Promise<boolean>;
    listHistory(): Promise<Array<HistoryEntry>>;
    listWorkflows(): Promise<Array<Workflow>>;
    refinePlan(instruction: string, conversation: Conversation): Promise<PlanResult>;
    savePreferences(prefs: Preferences): Promise<Preferences>;
    schema(): Promise<string>;
    searchWorkflows(searchText: string): Promise<Array<Workflow>>;
    setNotes(notes: string): Promise<Preferences>;
    setOpenAIApiKey(key: string): Promise<void>;
    toggleFavorite(id: WorkflowId): Promise<Workflow | null>;
    updateDApp(dApp: PreferredDApp): Promise<Preferences>;
    updateRule(rule: Rule): Promise<Preferences>;
    updateWorkflow(workflow: Workflow): Promise<Workflow | null>;
}
