import { QueryClient, type QueryClientConfig } from '@tanstack/react-query'

/** Defaults shared by every arorms frontend; override per project when a domain needs it. */
export const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
}

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...defaultQueryClientConfig,
    ...config,
    defaultOptions: {
      queries: {
        ...defaultQueryClientConfig.defaultOptions?.queries,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        ...defaultQueryClientConfig.defaultOptions?.mutations,
        ...config?.defaultOptions?.mutations,
      },
    },
  })
}
