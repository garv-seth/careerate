import { apiRequest } from "@/lib/queryClient";

/**
 * Utility to migrate authentication state between different auth systems
 * This helps ensure we don't have token conflicts between the v1 and v2 auth systems
 */
export const clearAllAuth = async (): Promise<void> => {
  try {
    // Try to log out of both auth systems
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (error: unknown) {
      console.log("Old auth logout failed or not needed");
    }
    
    try {
      await apiRequest("/api/v2/auth/logout", { method: "POST" });
    } catch (error: unknown) {
      console.log("New auth logout failed or not needed");
    }
    
    // Clear any auth cookies directly from the document
    document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Force page reload to clear any in-memory auth state
    window.location.href = "/login";
  } catch (error: unknown) {
    console.error("Error clearing authentication:", error);
  }
};

/**
 * Helper function to handle auth system migration
 * Only use this if you suspect a user is having auth token conflicts
 */
export const forceAuthSystemMigration = (): void => {
  // Check for 401 errors specifically from v2 but 200s from v1
  const migrateNeeded = localStorage.getItem('auth_migration_needed') === 'true';
  
  if (migrateNeeded) {
    clearAllAuth();
    localStorage.removeItem('auth_migration_needed');
  }
};

/**
 * Check for users who might be authenticated in the old system
 * but need to migrate to the new v2 auth system
 */
export const checkAuthMigrationNeeded = async (): Promise<boolean> => {
  try {
    // Check if user is authenticated in old system
    let oldAuthWorks = false;
    try {
      const oldAuthResponse = await fetch('/api/auth/me', { credentials: 'include' });
      oldAuthWorks = oldAuthResponse.status === 200;
    } catch (error: unknown) {
      // Old auth check failed, ignore
    }
    
    // Check if user is authenticated in new system
    let newAuthWorks = false;
    try {
      const newAuthResponse = await fetch('/api/v2/auth/me', { credentials: 'include' });
      newAuthWorks = newAuthResponse.status === 200;
    } catch (error: unknown) {
      // New auth check failed, ignore
    }
    
    // If user is authenticated in old system but not new one, migration is needed
    const migrationNeeded = oldAuthWorks && !newAuthWorks;
    
    if (migrationNeeded) {
      localStorage.setItem('auth_migration_needed', 'true');
      return true;
    }
    
    return false;
  } catch (error: unknown) {
    console.error("Error checking auth migration:", error);
    return false;
  }
};