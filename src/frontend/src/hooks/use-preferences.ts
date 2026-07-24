import { createActor } from "@/backend";
import type { Preferences, PreferredDApp, Rule } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const preferencesKey = ["preferences"] as const;

export function useGetPreferences() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: preferencesKey,
    queryFn: async (): Promise<Preferences | null> => {
      if (!actor) return null;
      return actor.getPreferences();
    },
    enabled: !!actor && !isFetching,
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
      if (!actor) throw new Error("Actor not ready");
      return actor.savePreferences(input);
    },
    onSuccess: () => {
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
      if (!actor) throw new Error("Actor not ready");
      return actor.addDApp(...input);
    },
    onSuccess: () => {
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
      if (!actor) throw new Error("Actor not ready");
      return actor.updateDApp(update);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

export function useDeleteDApp() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: PreferredDApp["id"]) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteDApp(id);
    },
    onSuccess: () => {
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
      if (!actor) throw new Error("Actor not ready");
      return actor.addRule(input);
    },
    onSuccess: () => {
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
      if (!actor) throw new Error("Actor not ready");
      return actor.updateRule(update);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: Rule["id"]) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteRule(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}

export function useSetNotes() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (notes: string) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.setNotes(notes);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: preferencesKey });
    },
  });
}
