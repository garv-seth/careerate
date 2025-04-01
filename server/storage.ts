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
  insights, type Insight, type InsertInsight,
  passwordResetTokens, type PasswordResetToken, type InsertPasswordResetToken,
  tasks, type Task, type InsertTask
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
  updatePassword(userId: number, newPassword: string): Promise<User | undefined>;
  
  // Password reset methods
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  
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
  
  // Store development plan with all milestones and resources
  storeDevelopmentPlan(transitionId: number, planData: any): Promise<void>;
  
  // Task methods
  getTasksByMilestoneId(milestoneId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTaskStatus(id: number, isDone: boolean): Promise<Task | undefined>;
  deleteTasksByMilestoneId(milestoneId: number): Promise<void>;
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
        .values(insertUser)
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
  
  async updatePassword(userId: number, newPassword: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }
  
  // Password reset methods
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }
  
  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }
  
  async deletePasswordResetToken(token: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
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
    // Type assertion to handle type mismatches with successMetrics and potentialChallenges arrays
    const planData = {
      transitionId: insertPlan.transitionId,
      overview: insertPlan.overview,
      estimatedTimeframe: insertPlan.estimatedTimeframe,
      successMetrics: insertPlan.successMetrics || [],
      potentialChallenges: insertPlan.potentialChallenges || []
    };
    
    const [plan] = await db
      .insert(plans)
      .values(planData as any)
      .returning();
    return plan;
  }

  // Milestone methods
  async getMilestonesByPlanId(planId: number): Promise<Milestone[]> {
    return db.select().from(milestones).where(eq(milestones.planId, planId)).orderBy(milestones.order);
  }

  async createMilestone(insertMilestone: InsertMilestone): Promise<Milestone> {
    // Handle type assertion for milestones
    const milestoneData = {
      planId: insertMilestone.planId,
      title: insertMilestone.title,
      description: insertMilestone.description,
      priority: insertMilestone.priority,
      timeframe: insertMilestone.timeframe,
      durationWeeks: insertMilestone.durationWeeks || 4,
      order: insertMilestone.order,
      progress: insertMilestone.progress || 0
    };
    
    const [milestone] = await db
      .insert(milestones)
      .values(milestoneData as any)
      .returning();
    return milestone;
  }

  // Resource methods
  async getResourcesByMilestoneId(milestoneId: number): Promise<Resource[]> {
    return db.select().from(resources).where(eq(resources.milestoneId, milestoneId));
  }

  async createResource(insertResource: InsertResource): Promise<Resource> {
    // Handle type assertion for resources
    const resourceData = {
      milestoneId: insertResource.milestoneId,
      taskId: insertResource.taskId,
      title: insertResource.title,
      description: insertResource.description,
      url: insertResource.url,
      type: insertResource.type
    };
    
    const [resource] = await db
      .insert(resources)
      .values(resourceData as any)
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
      // Delete tasks for each milestone
      await this.deleteTasksByMilestoneId(milestone.id);
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
    console.log(`Cleared all data for transition ID: {transitionId}`);
  }
  
  // Store development plan data
  async storeDevelopmentPlan(transitionId: number, planData: any): Promise<void> {
    console.log(`Storing development plan for transition ID: {transitionId}`);
    
    try {
      // First, clear any existing plan data
      await this.deletePlansByTransitionId(transitionId);
      
      // Create the plan record
      const plan = await this.createPlan({
        transitionId,
        overview: planData.overview || `Development plan for transition {transitionId}`,
        estimatedTimeframe: planData.estimatedTimeframe || "3-6 months",
        successMetrics: planData.successMetrics || [],
        potentialChallenges: planData.potentialChallenges || []
      });
      
      // Create milestones if they exist
      if (planData.milestones && Array.isArray(planData.milestones)) {
        for (let i = 0; i < planData.milestones.length; i++) {
          const milestoneData = planData.milestones[i];
          
          // Create milestone record
          const milestone = await this.createMilestone({
            planId: plan.id,
            title: milestoneData.title || `Milestone {i + 1}`,
            description: milestoneData.description || "",
            timeframe: milestoneData.timeframe || "2-4 weeks",
            durationWeeks: milestoneData.durationWeeks || parseInt(milestoneData.timeframe?.match(/\d+/)?.[0] || '4'),
            order: i + 1,
            priority: milestoneData.priority || "Medium",
            progress: milestoneData.progress || 0
          });
          
          // Process direct milestone resources first (if available)
          if (milestoneData.resources && Array.isArray(milestoneData.resources)) {
            console.log(`Processing {milestoneData.resources.length} direct resources for milestone {milestone.id}`);
            for (const resourceData of milestoneData.resources) {
              await this.createResource({
                milestoneId: milestone.id,
                title: resourceData.title || "Learning Resource",
                description: resourceData.description || "",
                url: resourceData.url || "#",
                type: resourceData.type || "other"
              });
            }
          }
          
          // Process tasks and their resources (if available)
          if (milestoneData.tasks && Array.isArray(milestoneData.tasks)) {
            console.log(`Processing tasks for milestone {milestone.id}`);
            for (const task of milestoneData.tasks) {
              // Create the task
              const storedTask = await this.createTask({
                milestoneId: milestone.id,
                content: task.task || "Complete task",
                isDone: false,
              });
              
              // Create resources for this task
              if (task.resources && Array.isArray(task.resources)) {
                for (const resourceData of task.resources) {
                  await this.createResource({
                    milestoneId: milestone.id,
                    taskId: storedTask.id,
                    title: resourceData.title || "Task Resource",
                    description: task.task || "",  // Use task description if available
                    url: resourceData.url || "#",
                    type: resourceData.type || "other"
                  });
                }
              }
            }
          }
        }
      }
      
      console.log(`Successfully stored development plan for transition ID: {transitionId}`);
    } catch (error) {
      console.error(`Error storing development plan for transition ID: {transitionId}:`, error);
      throw error;
    }
  }
  
  // Task methods
  async getTasksByMilestoneId(milestoneId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.milestoneId, milestoneId));
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }
  
  async updateTaskStatus(id: number, isDone: boolean): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set({ isDone })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }
  
  async deleteTasksByMilestoneId(milestoneId: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.milestoneId, milestoneId));
  }
}

export const storage = new DatabaseStorage();
