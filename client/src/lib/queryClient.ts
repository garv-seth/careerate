import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export async function apiRequest(
  method: ApiMethod,
  url: string,
  data?: any,
  customHeaders?: Record<string, string>
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  return fetch(url, config);
}

export async function getQueryFn<T>({ 
  on401 = "throw",
}: { 
  on401?: "throw" | "returnNull" 
} = {}) {
  return async ({ queryKey }: { queryKey: string[] }): Promise<T | null> => {
    const [url] = queryKey;
    try {
      const res = await fetch(url, { credentials: "include" });
      
      if (res.status === 401) {
        if (on401 === "returnNull") {
          return null;
        }
        throw new Error("Unauthorized");
      }
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      return res.json();
    } catch (err) {
      throw err;
    }
  };
}