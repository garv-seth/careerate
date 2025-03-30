import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = `${res.status}: ${res.statusText}`;
    
    try {
      // Try to parse the response as JSON first for structured error
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } else {
        // Fallback to plain text if not JSON
        const text = await res.text();
        if (text) {
          errorMessage = `${res.status}: ${text}`;
        }
      }
    } catch (parseError) {
      // Ignore JSON parsing errors and use the default message
      console.error("Error parsing response:", parseError);
    }
    
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
  }
): Promise<any> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // For auth endpoints, handle errors differently
    if (url.includes('/api/auth/')) {
      // Don't throw for auth endpoints, just return the JSON
      const responseData = await res.json();
      return responseData;
    } else {
      // For non-auth endpoints, use the standard error handling
      await throwIfResNotOk(res);
      return await res.json();
    }
  } catch (error) {
    // Add better error logging
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
