import { createActor } from "@/backend";
import type { Workflow, WorkflowId } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// All workflow CRUD goes through these hooks so cache keys stay consistent
// across pages. The actor is fetched at hook top level (never inside queryFn)
// per the platform convention.

const workflowsKey = ["workflows"] as const;
const workflowKey = (id: WorkflowId) => ["workflows", id] as const;

export function useListWorkflows() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: workflowsKey,
    queryFn: async () => {
      if (!actor) return [] as Workflow[];
      return actor.listWorkflows();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetWorkflow(id: WorkflowId | undefined) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: workflowKey(id ?? 0n),
    queryFn: async () => {
      if (!actor || id === undefined) return [] as Workflow[];
      return actor.getWorkflow(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

export function useSearchWorkflows(query: string) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["workflows", "search", query] as const,
    queryFn: async () => {
      if (!actor) return [] as Workflow[];
      return actor.searchWorkflows(query);
    },
    enabled: !!actor && !isFetching && query.trim().length > 0,
  });
}

type WorkflowInput = [string, string, string[], string, boolean];

export function useCreateWorkflow() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: WorkflowInput) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.createWorkflow(...input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workflowsKey });
    },
  });
}

type WorkflowUpdate = Workflow;

export function useUpdateWorkflow(id: WorkflowId) {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (update: WorkflowUpdate) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateWorkflow(update);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workflowsKey });
      void qc.invalidateQueries({ queryKey: workflowKey(id) });
    },
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: WorkflowId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.duplicateWorkflow(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workflowsKey });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: WorkflowId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteWorkflow(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workflowsKey });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: WorkflowId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.toggleFavorite(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: workflowsKey });
    },
  });
}

export function useExportWorkflowMarkdown() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: WorkflowId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.exportWorkflowMarkdown(id);
    },
  });
}
