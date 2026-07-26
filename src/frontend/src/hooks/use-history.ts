import { createActor } from "@/backend";
import type { HistoryEntry, HistoryId } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const historyKey = ["history"] as const;
const entryKey = (id: HistoryId) => ["history", id] as const;

export function useListHistory() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: historyKey,
    queryFn: async () => {
      if (!actor) return [] as HistoryEntry[];
      return actor.listHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetHistoryEntry(id: HistoryId | undefined) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: entryKey(id ?? 0n),
    queryFn: async () => {
      if (!actor || id === undefined) return null;
      return actor.getHistoryEntry(id);
    },
    enabled: !!actor && !isFetching && id !== undefined,
  });
}

export function useDeleteHistoryEntry() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (id: HistoryId) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.deleteHistoryEntry(id);
    },
    onSuccess: (_ok, id) => {
      void qc.invalidateQueries({ queryKey: historyKey });
      void qc.invalidateQueries({ queryKey: entryKey(id) });
    },
  });
}

// Local update of goal + planText only — no AI outcall, minimal cycles.
export function useUpdateHistoryEntry() {
  const qc = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: {
      id: HistoryId;
      goal: string;
      planText: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.updateHistoryEntry(input.id, input.goal, input.planText);
    },
    onSuccess: (saved, input) => {
      void qc.invalidateQueries({ queryKey: historyKey });
      void qc.invalidateQueries({ queryKey: entryKey(input.id) });
      if (saved) {
        qc.setQueryData(entryKey(input.id), saved);
      }
    },
  });
}
