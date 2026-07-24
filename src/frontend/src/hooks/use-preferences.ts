import { createActor } from "@/backend";
import type { Preferences, PreferredDApp, Rule } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const preferencesKey = ["preferences"] as const;

/** Empty preferences for first-time users (backend returns null until anything is saved). */
export const EMPTY_PREFERENCES: Preferences = {
  dApps: [],
  rules: [],
  notes: "",
};

function requireActor<T>(actor: T | null): asserts actor is T {
  if (!actor) {
    throw new Error(
      "Backend connection not ready. Wait a moment, or sign out and sign in again.",
    );
  }
}

export function useGetPreferences() {
  const { actor, isFetching: actorFetching } = useActor(createActor);
  return useQuery({
    queryKey: preferencesKey,
    queryFn: async (): Promise<Preferences> => {
      requireActor(actor);
      // Backend always returns a Preferences record (empty defaults for
      // first-time users). Keep a local fallback in case of partial data.
      const prefs = await actor.getPreferences();
      return {
        dApps: prefs.dApps ?? [],
        rules: prefs.rules ?? [],
        notes: prefs.notes ?? "",
      };
    },
    enabled: !!actor && !actorFetching,
    // Keep last good prefs visible while refetching after add/edit.
    placeholderData: (previous) => previous,
  });
}

type PreferencesInput = Parameters<
  ReturnType<typeof createActor>["savePreferences"]
>[0];

export function useSavePreferences() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: PreferencesInput) => {
      requireActor(actor);
      return actor.savePreferences(input);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

type DAppInput = [string, string];

export function useAddDApp() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: DAppInput) => {
      requireActor(actor);
      return actor.addDApp(...input);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

type DAppUpdate = PreferredDApp;

export function useUpdateDApp() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (update: DAppUpdate) => {
      requireActor(actor);
      return actor.updateDApp(update);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

export function useDeleteDApp() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: PreferredDApp["id"]) => {
      requireActor(actor);
      return actor.deleteDApp(id);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

type RuleInput = string;

export function useAddRule() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: RuleInput) => {
      requireActor(actor);
      return actor.addRule(input);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

type RuleUpdate = Rule;

export function useUpdateRule() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (update: RuleUpdate) => {
      requireActor(actor);
      return actor.updateRule(update);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: Rule["id"]) => {
      requireActor(actor);
      return actor.deleteRule(id);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

export function useSetNotes() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (notes: string) => {
      requireActor(actor);
      return actor.setNotes(notes);
    },
    onSuccess: (prefs) => {
      qc.setQueryData(preferencesKey, prefs);
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}
