import { db } from "../db";

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
      .select({ name: 'name' })
      .from('companies')
      .where('id', '=', companyId)
      .limit(1);
    
    if (!companyResult.length) {
      return "Unknown Role";
    }

    // Get role information
    const roleResult = await db
      .select({ title: 'title' })
      .from('company_roles')
      .where({
        company_id: companyId,
        id: roleId
      })
      .limit(1);
    
    if (!roleResult.length) {
      return companyResult[0].name;
    }

    // Get level information
    const levelResult = await db
      .select({ name: 'name' })
      .from('role_levels')
      .where({
        company_id: companyId,
        role_id: roleId,
        id: levelId
      })
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