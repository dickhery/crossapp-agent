import { createActor } from "@/backend";
import type { Conversation, PlanResult } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation } from "@tanstack/react-query";

// Chat is a single active conversation that clears on a new goal. We do not
// persist conversation history to the backend (History captures completed
// plans). These hooks wrap the plan generation + refinement outcalls.

type GeneratePlanInput = { goal: string; conversation: Conversation };

export function useGeneratePlan() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: GeneratePlanInput): Promise<PlanResult> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.generatePlan(input.goal, input.conversation);
    },
  });
}

type RefinePlanInput = { instruction: string; conversation: Conversation };

export function useRefinePlan() {
  const { actor } = useActor(createActor);
  return useMutation({
    mutationFn: async (input: RefinePlanInput): Promise<PlanResult> => {
      if (!actor) throw new Error("Actor not ready");
      return actor.refinePlan(input.instruction, input.conversation);
    },
  });
}
