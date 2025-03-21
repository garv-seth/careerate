import { 
  users, type User, type InsertUser,
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
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Role skills methods
  getRoleSkills(roleName: string): Promise<RoleSkill[]>;
  createRoleSkill(roleSkill: InsertRoleSkill): Promise<RoleSkill>;
  
  // Transition methods
  getTransition(id: number): Promise<Transition | undefined>;
  getTransitionByRoles(currentRole: string, targetRole: string): Promise<Transition | undefined>;
  createTransition(transition: InsertTransition): Promise<Transition>;
  updateTransitionStatus(id: number, isComplete: boolean): Promise<Transition | undefined>;
  
  // Scraped data methods
  getScrapedDataByTransitionId(transitionId: number): Promise<ScrapedData[]>;
  createScrapedData(scrapedData: InsertScrapedData): Promise<ScrapedData>;
  
  // Skill gap methods
  getSkillGapsByTransitionId(transitionId: number): Promise<SkillGap[]>;
  createSkillGap(skillGap: InsertSkillGap): Promise<SkillGap>;
  
  // Plan methods
  getPlanByTransitionId(transitionId: number): Promise<Plan | undefined>;
  createPlan(plan: InsertPlan): Promise<Plan>;
  
  // Milestone methods
  getMilestonesByPlanId(planId: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  
  // Resource methods
  getResourcesByMilestoneId(milestoneId: number): Promise<Resource[]>;
  createResource(resource: InsertResource): Promise<Resource>;
  
  // Insight methods
  getInsightsByTransitionId(transitionId: number): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
    // Create a properly structured insert object with just the fields from the schema
    const [data] = await db
      .insert(scrapedData)
      .values(insertScrapedData)
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
}

export const storage = new DatabaseStorage();
