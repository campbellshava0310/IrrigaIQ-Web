import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Retry transient failures only; 4xx answers will not change on retry.
      retry: (failureCount, error) =>
        failureCount < 2 &&
        (!(error instanceof ApiError) || error.isNetworkError || error.status >= 500),
    },
    mutations: {
      retry: false,
    },
  },
});
