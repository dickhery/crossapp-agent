import { QueryClient } from "@tanstack/react-query";

// Single shared QueryClient. Stable across renders so it can be created
// outside of any component and reused by the provider in main.tsx.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
