import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useQuery } from "@tanstack/react-query";

/** Whether the operator has configured an OpenAI key (anonymous-safe query). */
export function useIsOpenAIConfigured() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ["openai-configured"],
    queryFn: async (): Promise<boolean> => {
      if (!actor) return false;
      return actor.isOpenAIConfigured();
    },
    // Can be called without owner auth — still needs a ready actor.
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}
