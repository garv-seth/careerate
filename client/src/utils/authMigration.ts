import { apiRequest } from "@/lib/queryClient";

/**
 * Utility to clear authentication state
 * This helps ensure we don't have any stale authentication data
 */
export const clearAllAuth = async (shouldRedirect = false): Promise<void> => {
  try {
    // Log out using the V1 authentication endpoint
    try {
      console.log("Attempting to logout via API");
      await apiRequest("/api/auth/logout", { method: "POST" });
      console.log("API logout successful");
    } catch (error: unknown) {
      console.log("Logout API call failed or not needed:", error);
    }
    
    // Clear auth cookie as a backup measure
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    console.log("Cleared auth cookie manually");
    
    // Only redirect if explicitly requested
    if (shouldRedirect) {
      console.log("Redirecting to login page");
      window.location.href = "/login";
    }
  } catch (error: unknown) {
    console.error("Error clearing authentication:", error);
  }
};

/**
 * This function is kept for backward compatibility
 * It's no longer needed as we've standardized on the V1 auth system
 */
export const forceAuthSystemMigration = (): void => {
  // Simply clear auth (kept for backward compatibility)
  clearAllAuth();
};

/**
 * This function is kept for backward compatibility
 * It always returns false as there's no longer any migration needed
 */
export const checkAuthMigrationNeeded = async (): Promise<boolean> => {
  // We no longer need migration as we've standardized on V1 auth
  return false;
};