/**
 * Company data structure for dropdown selections
 * This file provides structured data about companies, roles, and levels
 */

export interface CompanyLevel {
  id: string;
  name: string;
  description?: string;
}

export interface CompanyRole {
  id: string;
  title: string;
  levels: CompanyLevel[];
  description?: string;
}

export interface Company {
  id: string;
  name: string;
  roles: CompanyRole[];
  logo?: string;
}

/**
 * Initial set of tech companies with common roles and levels
 * This data can be replaced by an API integration in the future
 */
export const companies: Company[] = [
  {
    id: "google",
    name: "Google",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "l3", name: "L3" },
          { id: "l4", name: "L4" },
          { id: "l5", name: "L5" },
          { id: "l6", name: "L6" },
          { id: "l7", name: "L7" },
          { id: "l8", name: "L8" }
        ]
      },
      {
        id: "pm",
        title: "Product Manager",
        levels: [
          { id: "l3", name: "L3" },
          { id: "l4", name: "L4" },
          { id: "l5", name: "L5" },
          { id: "l6", name: "L6" },
          { id: "l7", name: "L7" }
        ]
      },
      {
        id: "ux",
        title: "UX Designer",
        levels: [
          { id: "l3", name: "L3" },
          { id: "l4", name: "L4" },
          { id: "l5", name: "L5" },
          { id: "l6", name: "L6" }
        ]
      },
      {
        id: "data",
        title: "Data Scientist",
        levels: [
          { id: "l3", name: "L3" },
          { id: "l4", name: "L4" },
          { id: "l5", name: "L5" },
          { id: "l6", name: "L6" }
        ]
      }
    ]
  },
  {
    id: "microsoft",
    name: "Microsoft",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "59", name: "Level 59" },
          { id: "60", name: "Level 60" },
          { id: "61", name: "Level 61" },
          { id: "62", name: "Level 62" },
          { id: "63", name: "Level 63" },
          { id: "64", name: "Level 64" },
          { id: "65", name: "Level 65" },
          { id: "66", name: "Level 66" },
          { id: "67", name: "Level 67" }
        ]
      },
      {
        id: "pm",
        title: "Product Manager",
        levels: [
          { id: "59", name: "Level 59" },
          { id: "60", name: "Level 60" },
          { id: "61", name: "Level 61" },
          { id: "62", name: "Level 62" },
          { id: "63", name: "Level 63" },
          { id: "64", name: "Level 64" },
          { id: "65", name: "Level 65" }
        ]
      },
      {
        id: "design",
        title: "Designer",
        levels: [
          { id: "59", name: "Level 59" },
          { id: "60", name: "Level 60" },
          { id: "61", name: "Level 61" },
          { id: "62", name: "Level 62" },
          { id: "63", name: "Level 63" }
        ]
      }
    ]
  },
  {
    id: "meta",
    name: "Meta",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "e3", name: "E3" },
          { id: "e4", name: "E4" },
          { id: "e5", name: "E5" },
          { id: "e6", name: "E6" },
          { id: "e7", name: "E7" },
          { id: "e8", name: "E8" }
        ]
      },
      {
        id: "pm",
        title: "Product Manager",
        levels: [
          { id: "ic3", name: "IC3" },
          { id: "ic4", name: "IC4" },
          { id: "ic5", name: "IC5" },
          { id: "ic6", name: "IC6" }
        ]
      },
      {
        id: "design",
        title: "Product Designer",
        levels: [
          { id: "ic3", name: "IC3" },
          { id: "ic4", name: "IC4" },
          { id: "ic5", name: "IC5" },
          { id: "ic6", name: "IC6" }
        ]
      }
    ]
  },
  {
    id: "amazon",
    name: "Amazon",
    roles: [
      {
        id: "sde",
        title: "Software Development Engineer",
        levels: [
          { id: "sde1", name: "SDE I" },
          { id: "sde2", name: "SDE II" },
          { id: "sde3", name: "SDE III" },
          { id: "sde4", name: "Principal" }
        ]
      },
      {
        id: "pm",
        title: "Product Manager",
        levels: [
          { id: "pm1", name: "PM I" },
          { id: "pm2", name: "PM II" },
          { id: "pm3", name: "Senior PM" },
          { id: "pm4", name: "Principal PM" }
        ]
      }
    ]
  },
  {
    id: "apple",
    name: "Apple",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "ice1", name: "ICE1" },
          { id: "ice2", name: "ICE2" },
          { id: "ice3", name: "ICE3" },
          { id: "ice4", name: "ICE4" },
          { id: "ice5", name: "ICE5" },
          { id: "ice6", name: "ICE6" }
        ]
      },
      {
        id: "design",
        title: "Designer",
        levels: [
          { id: "1", name: "Designer I" },
          { id: "2", name: "Designer II" },
          { id: "3", name: "Designer III" },
          { id: "4", name: "Designer IV" },
          { id: "5", name: "Designer V" }
        ]
      }
    ]
  },
  {
    id: "netflix",
    name: "Netflix",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "senior", name: "Senior Software Engineer" },
          { id: "staff", name: "Staff Software Engineer" },
          { id: "senior-staff", name: "Senior Staff Software Engineer" }
        ]
      },
      {
        id: "pm",
        title: "Product Manager",
        levels: [
          { id: "senior", name: "Senior Product Manager" },
          { id: "director", name: "Director of Product" }
        ]
      }
    ]
  },
  {
    id: "salesforce",
    name: "Salesforce",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "mts", name: "MTS" },
          { id: "smts", name: "Senior MTS" },
          { id: "lmts", name: "Lead MTS" },
          { id: "pmts", name: "Principal MTS" },
          { id: "dpmts", name: "Distinguished Principal MTS" }
        ]
      }
    ]
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "se", name: "Software Engineer" },
          { id: "sse", name: "Senior Software Engineer" },
          { id: "staff", name: "Staff Software Engineer" },
          { id: "principal", name: "Principal Software Engineer" }
        ]
      }
    ]
  },
  {
    id: "uber",
    name: "Uber",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "l3", name: "L3" },
          { id: "l4", name: "L4" },
          { id: "l5", name: "L5" },
          { id: "l6", name: "L6" }
        ]
      }
    ]
  },
  {
    id: "airbnb",
    name: "Airbnb",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "l3", name: "Level 3" },
          { id: "l4", name: "Level 4" },
          { id: "l5", name: "Level 5" },
          { id: "l6", name: "Level 6" }
        ]
      }
    ]
  },
  {
    id: "other",
    name: "Other",
    roles: [
      {
        id: "swe",
        title: "Software Engineer",
        levels: [
          { id: "intern", name: "Intern" },
          { id: "junior", name: "Junior" },
          { id: "mid", name: "Mid-level" },
          { id: "senior", name: "Senior" },
          { id: "staff", name: "Staff" },
          { id: "principal", name: "Principal" }
        ]
      },
      {
        id: "pm",
        title: "Product Manager",
        levels: [
          { id: "intern", name: "Intern" },
          { id: "junior", name: "Junior" },
          { id: "mid", name: "Mid-level" },
          { id: "senior", name: "Senior" },
          { id: "director", name: "Director" }
        ]
      },
      {
        id: "design",
        title: "Designer",
        levels: [
          { id: "intern", name: "Intern" },
          { id: "junior", name: "Junior" },
          { id: "mid", name: "Mid-level" },
          { id: "senior", name: "Senior" },
          { id: "staff", name: "Staff" }
        ]
      },
      {
        id: "data",
        title: "Data Scientist",
        levels: [
          { id: "intern", name: "Intern" },
          { id: "junior", name: "Junior" },
          { id: "mid", name: "Mid-level" },
          { id: "senior", name: "Senior" },
          { id: "staff", name: "Staff" }
        ]
      },
      {
        id: "custom",
        title: "Custom Role",
        levels: [
          { id: "custom", name: "Custom Level" }
        ]
      }
    ]
  }
];

// Helper functions to work with the data
export function getCompanyById(id: string): Company | undefined {
  return companies.find(c => c.id === id);
}

export function getRolesByCompanyId(companyId: string): CompanyRole[] {
  const company = getCompanyById(companyId);
  return company ? company.roles : [];
}

export function getLevelsByCompanyAndRoleId(companyId: string, roleId: string): CompanyLevel[] {
  const company = getCompanyById(companyId);
  if (!company) return [];
  
  const role = company.roles.find(r => r.id === roleId);
  return role ? role.levels : [];
}

export async function formatRoleWithLevel(companyId: string, roleId: string, levelId: string): Promise<string> {
  try {
    // Call the backend API to format the role (or create a client-side version that matches the DB)
    const response = await fetch(`/api/format-role/${companyId}/${roleId}/${levelId}`);
    const data = await response.json();
    
    if (data.success && data.formattedRole) {
      return data.formattedRole;
    } else {
      throw new Error("Failed to format role");
    }
  } catch (error) {
    console.error("Error formatting role:", error);
    
    // Fallback to client-side formatting using the in-memory data
    // This is just for backward compatibility
    const company = getCompanyById(companyId);
    if (!company) return "Unknown Role";
    
    const role = company.roles.find(r => r.id === roleId);
    if (!role) return company.name;
    
    const level = role.levels.find(l => l.id === levelId);
    if (!level) return `${company.name} ${role.title}`;
    
    return `${company.name} ${role.title} ${level.name}`;
  }
}

export function parseRoleString(roleString: string): { companyId: string, roleId: string, levelId?: string } {
  // This is a simplistic parser that would need to be enhanced for production
  // It would try to match the string against known patterns in our data
  
  // Default to "other" if we can't parse
  return {
    companyId: "other",
    roleId: "custom"
  };
}