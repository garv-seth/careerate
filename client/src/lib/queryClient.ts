import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Helper function for making API requests
export async function apiRequest(
  method: HttpMethod, 
  endpoint: string, 
  body?: any
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {},
    credentials: 'include',
  };

  if (body) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers = {
        'Content-Type': 'application/json',
      };
      options.body = JSON.stringify(body);
    }
  }

  const response = await fetch(endpoint, options);

  if (!response.ok && response.status !== 401) {
    // Allow 401 to be handled by the caller
    const errorText = await response.text();
    throw new Error(errorText || `API request failed with status ${response.status}`);
  }

  return response;
}

// Default query function that gets used in useQuery
export const getQueryFn = (options?: { on401: 'throw' | 'returnNull' }) => {
  return async ({ queryKey }: { queryKey: string[] }) => {
    const [endpoint] = queryKey;
    const response = await apiRequest('GET', endpoint);

    if (response.status === 401) {
      if (options?.on401 === 'returnNull') {
        return null;
      }
      throw new Error('Unauthorized');
    }

    return response.json();
  };
};