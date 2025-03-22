import { 
  users, type User, type InsertUser,
  profiles, type Profile, type InsertProfile,
  userSkills, type UserSkill, type InsertUserSkill,
  transitions, type Transition, type InsertTransition,
  roleSkills, type RoleSkill, type InsertRoleSkill,
  scrapedData, type ScrapedData, type InsertScrapedData,
  skillGaps, type SkillGap, type InsertSkillGap,
  plans, type Plan, type InsertPlan,
  milestones, type Milestone, type InsertMilestone,
  resources, type Resource, type InsertResource,
  insights, type Insight, type InsertInsight
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

// Storage interface for CRUD operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: number, currentRole: string): Promise<User | undefined>;
  updateUserProfileStatus(userId: number, profileCompleted: boolean): Promise<User | undefined>;
  
  // Profile methods
  getProfile(userId: number): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: number, profileData: Partial<InsertProfile>): Promise<Profile | undefined>;
  
  // User skills methods
  getUserSkills(userId: number): Promise<UserSkill[]>;
  createUserSkill(userSkill: InsertUserSkill): Promise<UserSkill>;
  updateUserSkill(id: number, userSkill: Partial<InsertUserSkill>): Promise<UserSkill | undefined>;
  deleteUserSkill(id: number): Promise<void>;
  deleteUserSkillsByUserId(userId: number): Promise<void>;

  // Role skills methods
  getRoleSkills(roleName: string): Promise<RoleSkill[]>;
  createRoleSkill(roleSkill: InsertRoleSkill): Promise<RoleSkill>;
  
  // Transition methods
  getTransition(id: number): Promise<Transition | undefined>;
  getTransitionByRoles(currentRole: string, targetRole: string): Promise<Transition | undefined>;
  getTransitionsByUserId(userId: number): Promise<Transition[]>;
  createTransition(transition: InsertTransition): Promise<Transition>;
  updateTransitionStatus(id: number, isComplete: boolean): Promise<Transition | undefined>;
  
  // Scraped data methods
  getScrapedDataByTransitionId(transitionId: number): Promise<ScrapedData[]>;
  createScrapedData(scrapedData: InsertScrapedData): Promise<ScrapedData>;
  deleteScrapedDataByTransitionId(transitionId: number): Promise<void>;
  
  // Skill gap methods
  getSkillGapsByTransitionId(transitionId: number): Promise<SkillGap[]>;
  createSkillGap(skillGap: InsertSkillGap): Promise<SkillGap>;
  deleteSkillGapsByTransitionId(transitionId: number): Promise<void>;
  
  // Plan methods
  getPlanByTransitionId(transitionId: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  deletePlansByTransitionId(transitionId: number): Promise<void>;
  
  // Milestone methods
  getMilestonesByPlanId(planId: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  deleteMilestonesByPlanId(planId: number): Promise<void>;
  
  // Resource methods
  getResourcesByMilestoneId(milestoneId: number): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  deleteResourcesByMilestoneId(milestoneId: number): Promise<void>;
  
  // Insight methods
  getInsightsByTransitionId(transitionId: number): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  deleteInsightsByTransitionId(transitionId: number): Promise<void>;
  
  // Clear all transition data
  clearTransitionData(transitionId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  // Username field removed - using email as the primary identifier
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log('Inserting user into database with data:', JSON.stringify(insertUser));
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...insertUser,
          username: insertUser.email // Use email as username
        })
        .returning();
      console.log('User successfully inserted:', user);
      return user;
    } catch (error) {
      console.error('Error inserting user into database:', error);
      throw error;
    }
  }
  
  async updateUserRole(userId: number, currentRole: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ currentRole })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  async updateUserProfileStatus(userId: number, profileCompleted: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ profileCompleted })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Profile methods
  async getProfile(userId: number): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }
  
  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const [profile] = await db
      .insert(profiles)
      .values(insertProfile)
      .returning();
    return profile;
  }
  
  async updateProfile(userId: number, profileData: Partial<InsertProfile>): Promise<Profile | undefined> {
    const [profile] = await db
      .update(profiles)
      .set(profileData)
      .where(eq(profiles.userId, userId))
      .returning();
    return profile;
  }
  
  // User skills methods
  async getUserSkills(userId: number): Promise<UserSkill[]> {
    return db.select().from(userSkills).where(eq(userSkills.userId, userId));
  }
  
  async createUserSkill(insertUserSkill: InsertUserSkill): Promise<UserSkill> {
    const [skill] = await db
      .insert(userSkills)
      .values(insertUserSkill)
      .returning();
    return skill;
  }
  
  async updateUserSkill(id: number, userSkillData: Partial<InsertUserSkill>): Promise<UserSkill | undefined> {
    const [skill] = await db
      .update(userSkills)
      .set(userSkillData)
      .where(eq(userSkills.id, id))
      .returning();
    return skill;
  }
  
  async deleteUserSkill(id: number): Promise<void> {
    await db.delete(userSkills).where(eq(userSkills.id, id));
  }
  
  async deleteUserSkillsByUserId(userId: number): Promise<void> {
    await db.delete(userSkills).where(eq(userSkills.userId, userId));
  }
  
  // Get transitions by user ID
  async getTransitionsByUserId(userId: number): Promise<Transition[]> {
    return db.select().from(transitions).where(eq(transitions.userId, userId));
  }

  // Role skills methods
  async getRoleSkills(roleName: string): Promise<RoleSkill[]> {
    return db.select().from(roleSkills).where(eq(roleSkills.roleName, roleName));
  }

  async createRoleSkill(insertRoleSkill: InsertRoleSkill): Promise<RoleSkill> {
    const [roleSkill] = await db
      .insert(roleSkills)
      .values(insertRoleSkill)
      .returning();
    return roleSkill;
  }

  // Transition methods
  async getTransition(id: number): Promise<Transition | undefined> {
    const [transition] = await db.select().from(transitions).where(eq(transitions.id, id));
    return transition;
  }

  async getTransitionByRoles(currentRole: string, targetRole: string): Promise<Transition | undefined> {
    const [transition] = await db.select().from(transitions).where(
      and(
        eq(transitions.currentRole, currentRole),
        eq(transitions.targetRole, targetRole)
      )
    );
    return transition;
  }

  async createTransition(insertTransition: InsertTransition): Promise<Transition> {
    const [transition] = await db
      .insert(transitions)
      .values(insertTransition)
      .returning();
    return transition;
  }

  async updateTransitionStatus(id: number, isComplete: boolean): Promise<Transition | undefined> {
    const [transition] = await db
      .update(transitions)
      .set({ isComplete })
      .where(eq(transitions.id, id))
      .returning();
    return transition;
  }

  // Scraped data methods
  async getScrapedDataByTransitionId(transitionId: number): Promise<ScrapedData[]> {
    return db.select().from(scrapedData).where(eq(scrapedData.transitionId, transitionId));
  }

  async createScrapedData(insertScrapedData: InsertScrapedData): Promise<ScrapedData> {
    // For simplicity, let's avoid the type issue by serializing and parsing the array
    // This is a workaround for the TypeScript error
    const emptyArray: string[] = [];
    const skills = insertScrapedData.skillsExtracted || emptyArray;
    const serializedSkills = JSON.stringify(skills);
    const parsedSkills = JSON.parse(serializedSkills);
    
    // Use type assertion to bypass TypeScript error and ensure no null values are passed to required fields
    const valueToInsert = {
      transitionId: insertScrapedData.transitionId,
      source: insertScrapedData.source || "Extracted Data", // Ensure source is never null
      content: insertScrapedData.content || "No content available", // Ensure content is never null
      url: insertScrapedData.url || null,
      postDate: insertScrapedData.postDate || new Date().toISOString().split('T')[0],
      skillsExtracted: parsedSkills
    } as any;
    
    const [data] = await db
      .insert(scrapedData)
      .values(valueToInsert)
      .returning();
    
    return data;
  }

  // Skill gap methods
  async getSkillGapsByTransitionId(transitionId: number): Promise<SkillGap[]> {
    return db.select().from(skillGaps).where(eq(skillGaps.transitionId, transitionId));
  }

  async createSkillGap(insertSkillGap: InsertSkillGap): Promise<SkillGap> {
    const [gap] = await db
      .insert(skillGaps)
      .values(insertSkillGap)
      .returning();
    return gap;
  }

  // Plan methods
  async getPlanByTransitionId(transitionId: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.transitionId, transitionId));
    return plan;
  }

  async createPlan(insertPlan: InsertPlan): Promise<Plan> {
    const [plan] = await db
      .insert(plans)
      .values(insertPlan)
      .returning();
    return plan;
  }

  // Milestone methods
  async getMilestonesByPlanId(planId: number): Promise<Milestone[]> {
    return db.select().from(milestones).where(eq(milestones.planId, planId)).orderBy(milestones.order);
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    const [milestone] = await db
      .insert(milestones)
      .values(insertMilestone)
      .returning();
    return milestone;
  }

  // Resource methods
  async getResourcesByMilestoneId(milestoneId: number): Promise<Resource[]> {
    return db.select().from(resources).where(eq(resources.milestoneId, milestoneId));
  }

  async createResource(insertResource: InsertResource): Promise<Resource> {
    const [resource] = await db
      .insert(resources)
      .values(insertResource)
      .returning();
    return resource;
  }

  // Insight methods
  async getInsightsByTransitionId(transitionId: number): Promise<Insight[]> {
    return db.select().from(insights).where(eq(insights.transitionId, transitionId));
  }

  async createInsight(insertInsight: InsertInsight): Promise<Insight> {
    const [insight] = await db
      .insert(insights)
      .values(insertInsight)
      .returning();
    return insight;
  }
  
  // Delete methods for clearing transition data
  async deleteScrapedDataByTransitionId(transitionId: number): Promise<void> {
    await db.delete(scrapedData).where(eq(scrapedData.transitionId, transitionId));
  }
  
  async deleteSkillGapsByTransitionId(transitionId: number): Promise<void> {
    await db.delete(skillGaps).where(eq(skillGaps.transitionId, transitionId));
  }
  
  async deletePlansByTransitionId(transitionId: number): Promise<void> {
    // First, get all plans to find their IDs for milestone and resource deletion
    const transitionPlans = await this.getPlanByTransitionId(transitionId);
    if (transitionPlans) {
      // Delete the milestones for each plan
      await this.deleteMilestonesByPlanId(transitionPlans.id);
    }
    
    // Now delete the plans
    await db.delete(plans).where(eq(plans.transitionId, transitionId));
  }
  
  async deleteMilestonesByPlanId(planId: number): Promise<void> {
    // First, get all milestones to find their IDs for resource deletion
    const planMilestones = await this.getMilestonesByPlanId(planId);
    for (const milestone of planMilestones) {
      // Delete resources for each milestone
      await this.deleteResourcesByMilestoneId(milestone.id);
    }
    
    // Now delete the milestones
    await db.delete(milestones).where(eq(milestones.planId, planId));
  }
  
  async deleteResourcesByMilestoneId(milestoneId: number): Promise<void> {
    await db.delete(resources).where(eq(resources.milestoneId, milestoneId));
  }
  
  async deleteInsightsByTransitionId(transitionId: number): Promise<void> {
    await db.delete(insights).where(eq(insights.transitionId, transitionId));
  }
  
  // Clear all transition data
  async clearTransitionData(transitionId: number): Promise<void> {
    // Delete in the correct order based on foreign key dependencies
    await this.deleteInsightsByTransitionId(transitionId);
    await this.deletePlansByTransitionId(transitionId);
    await this.deleteSkillGapsByTransitionId(transitionId);
    await this.deleteScrapedDataByTransitionId(transitionId);
    
    // Keep the transition record itself
    console.log(`Cleared all data for transition ID: ${transitionId}`);
  }
}

export const storage = new DatabaseStorage();
