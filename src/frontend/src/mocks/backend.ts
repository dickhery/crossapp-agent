/* eslint-disable */
// @ts-nocheck
//
// Visual-QA mock backend. Enables `VITE_USE_MOCK=true pnpm dev` for
// frontend-only iteration without a running replica. The shape mirrors
// `backendInterface` from `src/backend.d.ts` and returns realistic sample
// data so every protected page (Dashboard, Chat, Workflows, Memory, History)
// can render with content.
//
// NOTE: This mock is consumed by `@caffeineai/core-infrastructure`'s
// `createActorWithConfig` only when that package's `./mocks/backend.*` glob
// resolves it. Keep the export name `mockBackend` stable.

import type { backendInterface } from "../backend";
import { ChatRole } from "../backend";
import type {
  HistoryEntry,
  Preferences,
  Workflow,
} from "../backend";

// A stable sample principal text used for owner fields in mock data.
const SAMPLE_PRINCIPAL_TEXT =
  "r7x4-tqaaa-aaaaq-aaaca-cai";

// Helper: build a sample Workflow record.
function sampleWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 1n,
    owner: SAMPLE_PRINCIPAL_TEXT as never,
    name: "Move rare NFTs to vault",
    description:
      "Identify rare NFTs in Marketplace A, transfer them to the personal vault, and list the remainder on Marketplace B.",
    tags: ["nft", "vault", "marketplace"],
    planText:
      "1. Connect to Marketplace A via the ICP MCP `collection_list` tool.\n2. Filter holdings by rarity score > 0.8.\n3. Transfer rare items to the personal vault canister.\n4. List the remainder on Marketplace B with a 10% floor offset.",
    favorite: true,
    createdAt: 1_720_000_000_000_000_000n,
    updatedAt: 1_720_000_000_000_000_000n,
    ...overrides,
  } as Workflow;
}

const sampleWorkflows: Workflow[] = [
  sampleWorkflow({ id: 1n, favorite: true, name: "Move rare NFTs to vault" }),
  sampleWorkflow({
    id: 2n,
    favorite: false,
    name: "Rebalance ICP across wallets",
    description:
      "Move ICP from the hot wallet to savings, keeping no more than 50% in the hot wallet.",
    tags: ["icp", "wallet", "rebalance"],
    planText:
      "1. Query hot wallet balance via `ledger_account_balance`.\n2. Compute 50% threshold.\n3. Transfer excess to the savings wallet.\n4. Confirm receipt.",
  }),
];

const sampleHistory: HistoryEntry[] = [
  {
    id: 1n,
    owner: SAMPLE_PRINCIPAL_TEXT as never,
    goal: "Move my rare NFTs from Marketplace A to my personal vault and list the rest on Marketplace B",
    planText:
      "1. Connect to Marketplace A.\n2. Filter rare NFTs.\n3. Transfer to vault.\n4. List remainder on Marketplace B.",
    createdAt: 1_720_000_000_000_000_000n,
  } as HistoryEntry,
  {
    id: 2n,
    owner: SAMPLE_PRINCIPAL_TEXT as never,
    goal: "Check cycles on all my canisters and top up any below 1T",
    planText:
      "1. List canisters via `canister_status`.\n2. Filter those below 1T cycles.\n3. Top up from the cycles wallet.",
    createdAt: 1_719_990_000_000_000_000n,
  } as HistoryEntry,
];

const samplePreferences: Preferences = {
  notes:
    "Prefer conservative actions. Always confirm before transferring more than 50% of any balance.",
  dApps: [
    {
      id: 1n,
      friendlyName: "My NFT Vault",
      canisterIds: ["rrkah-fqaaa-aaaaa-aaaaq-cai"],
      accountIds: ["example-agent-account-id"],
    },
    {
      id: 2n,
      friendlyName: "Marketplace A",
      canisterIds: ["ryjl3-tyaaa-aaaaa-aaaba-cai"],
      accountIds: [],
    },
  ],
  rules: [
    { id: 1n, text: "Never move more than 50% of my ICP in one action" },
    { id: 2n, text: "Always check cycles before upgrading a canister" },
  ],
};

// In-memory mutable copies so create/update/delete flows have state.
let workflows = [...sampleWorkflows];
let history = [...sampleHistory];
let preferences: Preferences | null = samplePreferences;
let nextWorkflowId = 3n;
let nextHistoryId = 3n;
let nextDAppId = 3n;
let nextRuleId = 3n;

export const mockBackend: backendInterface = {
  // --- Auth / access-control (no-ops in mock) -----------------------------
  _initialize_access_control: async () => undefined,
  _internet_identity_sign_in_start: async () => new Uint8Array([0]),
  _internet_identity_sign_in_finish: async () => ({ __kind__: "ok", ok: null }),
  assignCallerUserRole: async () => undefined,
  getCallerUserRole: async () => "user" as never,
  isCallerAdmin: async () => false,
  isOpenAIConfigured: async () => true,

  // --- Workflows ---------------------------------------------------------
  listWorkflows: async () => [...workflows],
  getWorkflow: async (id) => workflows.find((w) => w.id === id) ?? null,
  searchWorkflows: async (q) => {
    const needle = q.toLowerCase();
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(needle) ||
        w.description.toLowerCase().includes(needle) ||
        w.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  },
  createWorkflow: async (name, description, tags, planText, favorite) => {
    const wf = sampleWorkflow({
      id: nextWorkflowId++,
      name,
      description,
      tags,
      planText,
      favorite,
      createdAt: BigInt(Date.now()) * 1_000_000n,
      updatedAt: BigInt(Date.now()) * 1_000_000n,
    });
    workflows = [wf, ...workflows];
    return wf;
  },
  updateWorkflow: async (wf) => {
    workflows = workflows.map((w) => (w.id === wf.id ? wf : w));
    return wf;
  },
  duplicateWorkflow: async (id) => {
    const src = workflows.find((w) => w.id === id);
    if (!src) return null;
    const copy = sampleWorkflow({
      ...src,
      id: nextWorkflowId++,
      name: `${src.name} (copy)`,
      favorite: false,
      createdAt: BigInt(Date.now()) * 1_000_000n,
      updatedAt: BigInt(Date.now()) * 1_000_000n,
    });
    workflows = [copy, ...workflows];
    return copy;
  },
  deleteWorkflow: async (id) => {
    const before = workflows.length;
    workflows = workflows.filter((w) => w.id !== id);
    return workflows.length < before;
  },
  toggleFavorite: async (id) => {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return null;
    wf.favorite = !wf.favorite;
    return wf;
  },
  exportWorkflowMarkdown: async (id) => {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return null;
    return `# ${wf.name}\n\n${wf.description}\n\n## Plan\n\n${wf.planText}\n`;
  },

  // --- History -----------------------------------------------------------
  listHistory: async () => [...history],
  getHistoryEntry: async (id) => history.find((h) => h.id === id) ?? null,
  deleteHistoryEntry: async (id) => {
    const before = history.length;
    history = history.filter((h) => h.id !== id);
    return history.length < before;
  },
  updateHistoryEntry: async (id, goal, planText) => {
    const idx = history.findIndex((h) => h.id === id);
    if (idx < 0) return null;
    const updated = { ...history[idx], goal, planText } as HistoryEntry;
    history = history.map((h, i) => (i === idx ? updated : h));
    return updated;
  },

  // --- Preferences -------------------------------------------------------
  getPreferences: async () =>
    preferences ?? { dApps: [], rules: [], notes: "" },
  savePreferences: async (prefs) => {
    preferences = prefs;
    return prefs;
  },
  setNotes: async (notes) => {
    preferences = preferences
      ? { ...preferences, notes }
      : { notes, dApps: [], rules: [] };
    return preferences;
  },
  addDApp: async (friendlyName, canisterIds, accountIds) => {
    preferences = preferences ?? { notes: "", dApps: [], rules: [] };
    preferences.dApps = [
      ...preferences.dApps,
      {
        id: nextDAppId++,
        friendlyName,
        canisterIds,
        accountIds: accountIds ?? [],
      },
    ];
    return preferences;
  },
  updateDApp: async (dApp) => {
    preferences = preferences ?? { notes: "", dApps: [], rules: [] };
    preferences.dApps = preferences.dApps.map((d) =>
      d.id === dApp.id ? dApp : d,
    );
    return preferences;
  },
  deleteDApp: async (id) => {
    preferences = preferences ?? { notes: "", dApps: [], rules: [] };
    preferences.dApps = preferences.dApps.filter((d) => d.id !== id);
    return preferences;
  },
  addRule: async (text) => {
    preferences = preferences ?? { notes: "", dApps: [], rules: [] };
    preferences.rules = [...preferences.rules, { id: nextRuleId++, text }];
    return preferences;
  },
  updateRule: async (rule) => {
    preferences = preferences ?? { notes: "", dApps: [], rules: [] };
    preferences.rules = preferences.rules.map((r) =>
      r.id === rule.id ? rule : r,
    );
    return preferences;
  },
  deleteRule: async (id) => {
    preferences = preferences ?? { notes: "", dApps: [], rules: [] };
    preferences.rules = preferences.rules.filter((r) => r.id !== id);
    return preferences;
  },

  // --- Plan generation (mock LLM) ---------------------------------------
  generatePlan: async (goal) => ({
    planText: `Plan for: ${goal}\n\n1. Identify the target canisters and their IDs from your saved dApps.\n2. Verify balances and current state via the ICP MCP tools.\n3. Execute the transfers in priority order, confirming each step.\n4. Verify final state and record the outcome in history.`,
  }),
  refinePlan: async (instruction) => ({
    planText: `Refined plan (${instruction}):\n\n1. Identify the target canisters.\n2. Apply the refinement: ${instruction}.\n3. Execute with safety checks.\n4. Verify and record.`,
  }),

  // --- OQL (Data Intelligence) ------------------------------------------
  schema: async () =>
    JSON.stringify({ entities: ["workflow", "historyEntry", "preferences"] }),
  execute: async () => ({ hasMore: false, rows: [] }),

  // --- OpenAI key management --------------------------------------------
  setOpenAIApiKey: async () => undefined,
};
