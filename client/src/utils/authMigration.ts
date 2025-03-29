import { apiRequest } from "@/lib/queryClient";

/**
 * Utility to clear authentication state
 * This helps ensure we don't have any stale authentication data
 */
export const clearAllAuth = async (): Promise<void> => {
  try {
    // Log out using the V1 authentication endpoint
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error: unknown) {
      console.log("Logout failed or not needed");
    }
    
    // Clear auth cookie as a backup measure
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Redirect to login page
    window.location.href = "/login";
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