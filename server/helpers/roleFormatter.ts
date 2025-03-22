import { db } from "../db";
import { companies, companyRoles, roleLevels } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Formats a role with level information from the database
 */
export async function formatRoleWithLevel(
  companyId: string,
  roleId: string,
  levelId: string
): Promise<string> {
  try {
    // Get company information
    const companyResult = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    
    if (!companyResult.length) {
      return "Unknown Role";
    }

    // Get role information
    const roleResult = await db
      .select({ title: companyRoles.title })
      .from(companyRoles)
      .where(
        and(
          eq(companyRoles.company_id, companyId),
          eq(companyRoles.id, roleId)
        )
      )
      .limit(1);
    
    if (!roleResult.length) {
      return companyResult[0].name;
    }

    // Get level information
    const levelResult = await db
      .select({ name: roleLevels.name })
      .from(roleLevels)
      .where(
        and(
          eq(roleLevels.company_id, companyId),
          eq(roleLevels.role_id, roleId),
          eq(roleLevels.id, levelId)
        )
      )
      .limit(1);
    
    if (!levelResult.length) {
      return `${companyResult[0].name} ${roleResult[0].title}`;
    }

    // Return formatted string with all components
    return `${companyResult[0].name} ${roleResult[0].title} ${levelResult[0].name}`;
  } catch (error) {
    console.error("Error formatting role with level:", error);
    return "Unknown Role";
  }
}