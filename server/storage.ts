import {
  users,
  profiles,
  type User,
  type UpsertUser,
  type Profile,
  type InsertProfile,
  vectors,
  type Vector,
  type InsertVector,
  careerPaths,
  type CareerPath,
  type InsertCareerPath,
  careerMilestones,
  type CareerMilestone,
  type InsertCareerMilestone,
  networkEvents,
  type NetworkEvent,
  eventRegistrations,
  type EventRegistration,
  type InsertEventRegistration,
  userSkills,
  type UserSkill,
  type InsertUserSkill,
  userLearningPaths,
  type LearningPath,
  type InsertLearningPath,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Profile operations
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  createProfile(profile: { 
    userId: string, 
    resumeText: string | null, 
    lastScan: Date | null,
    careerStage?: string,
    industryFocus?: string[],
    careerGoals?: string,
    preferredLearningStyle?: string,
    timeAvailability?: string
  }): Promise<Profile>;
  updateProfileResume(userId: string, resumeText: string): Promise<Profile>;
  updateProfile(userId: string, updates: {
    careerStage?: string,
    industryFocus?: string[],
    careerGoals?: string,
    preferredLearningStyle?: string,
    timeAvailability?: string
  }): Promise<Profile>;

  // Skills operations
  getUserSkills(userId: string): Promise<UserSkill[]>;
  addUserSkill(userSkill: InsertUserSkill): Promise<UserSkill>;
  deleteUserSkills(userId: string): Promise<void>;

  // Vector operations
  getVectorsByUserId(userId: string): Promise<Vector[]>;
  createVector(vector: InsertVector): Promise<Vector>;
  deleteVectorsByUserId(userId: string): Promise<void>;

  // PREMIUM FEATURE 1: Career Trajectory Mapping
  getCareerPathsByUserId(userId: string): Promise<CareerPath[]>;
  getCareerPathById(id: number): Promise<CareerPath | undefined>;
  createCareerPath(careerPath: InsertCareerPath): Promise<CareerPath>;
  updateCareerPath(id: number, updates: Partial<InsertCareerPath>): Promise<CareerPath>;
  deleteCareerPath(id: number): Promise<void>;

  getMilestonesByCareerPathId(careerPathId: number): Promise<CareerMilestone[]>;
  createCareerMilestone(milestone: InsertCareerMilestone): Promise<CareerMilestone>;
  updateCareerMilestoneStatus(id: number, isCompleted: boolean): Promise<CareerMilestone>;

  getAlternativePathsByCareerPathId(careerPathId: number): Promise<any[]>;

  // PREMIUM FEATURE 2: Executive Network Access
  getUpcomingNetworkEvents(limit?: number): Promise<NetworkEvent[]>;
  getNetworkEventById(id: number): Promise<NetworkEvent | undefined>;
  registerForEvent(registration: InsertEventRegistration): Promise<EventRegistration>;
  getUserEventRegistrations(userId: string): Promise<any[]>;

  getAvailableMentorships(limit?: number): Promise<any[]>;
  getMentorshipById(id: number): Promise<any | undefined>;
  applyForMentorship(application: { mentorshipId: number, userId: string, goalsDescription: string }): Promise<any>;
  getUserMentorshipApplications(userId: string): Promise<any[]>;

  // PREMIUM FEATURE 3: Skills Gap Accelerator
  getAllSkills(category?: string): Promise<any[]>;
  getSkillById(id: number): Promise<any | undefined>;
  getUserSkills(userId: string): Promise<UserSkill[]>;
  addUserSkill(userSkill: InsertUserSkill): Promise<UserSkill>;
  updateUserSkillLevel(id: number, currentLevel: number, targetLevel: number): Promise<UserSkill>;

  getLearningResourcesBySkillIds(skillIds: number[]): Promise<any[]>;
  getLearningResourceById(id: number): Promise<any | undefined>;

  getUserLearningPaths(userId: string): Promise<LearningPath[]>;
  getLearningPathById(id: number): Promise<any | undefined>;
  createLearningPath(learningPath: InsertLearningPath): Promise<LearningPath>;
  addResourceToLearningPath(learningPathId: number, resourceId: number, order: number): Promise<any>;
  markResourceAsCompleted(learningPathId: number, resourceId: number): Promise<any>;
  getLearningPathProgress(learningPathId: number): Promise<number>;

  // Settings operations
  getUserSettings(userId: string): Promise<any | null>;
  updateUserSettings(userId: string, settings: any): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Profile operations
  async getProfileByUserId(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async createProfile(profileData: { 
    userId: string, 
    resumeText: string | null, 
    lastScan: Date | null,
    careerStage?: string,
    industryFocus?: string[],
    careerGoals?: string,
    preferredLearningStyle?: string,
    timeAvailability?: string
  }): Promise<Profile> {
    const [profile] = await db.insert(profiles).values(profileData).returning();
    return profile;
  }

  async updateProfileResume(userId: string, resumeText: string): Promise<Profile> {
    const [profile] = await db
      .update(profiles)
      .set({ 
        resumeText,
        lastScan: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    if (!profile) {
      // If no profile exists, create one
      return this.createProfile({ 
        userId, 
        resumeText,
        lastScan: new Date(),
      });
    }

    return profile;
  }

  async updateProfile(userId: string, updates: {
    careerStage?: string,
    industryFocus?: string[],
    careerGoals?: string,
    preferredLearningStyle?: string,
    timeAvailability?: string
  }): Promise<Profile> {
    // Check if profile exists
    const existingProfile = await this.getProfileByUserId(userId);

    if (!existingProfile) {
      // Create new profile if it doesn't exist
      return this.createProfile({
        userId,
        resumeText: null,
        lastScan: null,
        ...updates
      });
    }

    // Update existing profile
    const [profile] = await db
      .update(profiles)
      .set({ 
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    return profile;
  }

  // Skills operations
  async getUserSkills(userId: string): Promise<UserSkill[]> {
    return db.select().from(userSkills).where(eq(userSkills.userId, userId));
  }

  async addUserSkill(userSkillData: InsertUserSkill): Promise<UserSkill> {
    const [skill] = await db.insert(userSkills).values(userSkillData).returning();
    return skill;
  }

  async deleteUserSkills(userId: string): Promise<void> {
    await db.delete(userSkills).where(eq(userSkills.userId, userId));
  }

  // Vector operations
  async getVectorsByUserId(userId: string): Promise<Vector[]> {
    return db.select().from(vectors).where(eq(vectors.userId, userId));
  }

  async createVector(vectorData: InsertVector): Promise<Vector> {
    const [vector] = await db.insert(vectors).values(vectorData).returning();
    return vector;
  }

  async deleteVectorsByUserId(userId: string): Promise<void> {
    await db.delete(vectors).where(eq(vectors.userId, userId));
  }

  // PREMIUM FEATURE 1: Career Trajectory Mapping
  async getCareerPathsByUserId(userId: string): Promise<CareerPath[]> {
    return db.select().from(careerPaths).where(eq(careerPaths.userId, userId));
  }

  async getCareerPathById(id: number): Promise<CareerPath | undefined> {
    const [careerPath] = await db.select().from(careerPaths).where(eq(careerPaths.id, id));
    return careerPath;
  }

  async createCareerPath(careerPathData: InsertCareerPath): Promise<CareerPath> {
    const [careerPath] = await db.insert(careerPaths).values(careerPathData).returning();
    return careerPath;
  }

  async updateCareerPath(id: number, updates: Partial<InsertCareerPath>): Promise<CareerPath> {
    const [careerPath] = await db
      .update(careerPaths)
      .set({ 
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(careerPaths.id, id))
      .returning();

    return careerPath;
  }

  async deleteCareerPath(id: number): Promise<void> {
    await db.delete(careerPaths).where(eq(careerPaths.id, id));
  }

  async getMilestonesByCareerPathId(careerPathId: number): Promise<CareerMilestone[]> {
    return db
      .select()
      .from(careerMilestones)
      .where(eq(careerMilestones.careerPathId, careerPathId))
      .orderBy(careerMilestones.order);
  }

  async createCareerMilestone(milestoneData: InsertCareerMilestone): Promise<CareerMilestone> {
    const [milestone] = await db.insert(careerMilestones).values(milestoneData).returning();
    return milestone;
  }

  async updateCareerMilestoneStatus(id: number, isCompleted: boolean): Promise<CareerMilestone> {
    const [milestone] = await db
      .update(careerMilestones)
      .set({ 
        isCompleted,
        updatedAt: new Date(),
      })
      .where(eq(careerMilestones.id, id))
      .returning();

    return milestone;
  }

  async getAlternativePathsByCareerPathId(careerPathId: number): Promise<any[]> {
    // Implementation pending
    return [];
  }

  // PREMIUM FEATURE 2: Executive Network Access
  async getUpcomingNetworkEvents(limit: number = 10): Promise<NetworkEvent[]> {
    return db
      .select()
      .from(networkEvents)
      .where(sql`${networkEvents.eventDate} >= NOW()`)
      .orderBy(networkEvents.eventDate)
      .limit(limit);
  }

  async getNetworkEventById(id: number): Promise<NetworkEvent | undefined> {
    const [event] = await db.select().from(networkEvents).where(eq(networkEvents.id, id));
    return event;
  }

  async registerForEvent(registrationData: InsertEventRegistration): Promise<EventRegistration> {
    const [registration] = await db.insert(eventRegistrations).values(registrationData).returning();
    return registration;
  }

  async getUserEventRegistrations(userId: string): Promise<any[]> {
    return db
      .select({
        registration: eventRegistrations,
        event: networkEvents,
      })
      .from(eventRegistrations)
      .innerJoin(
        networkEvents,
        eq(eventRegistrations.eventId, networkEvents.id)
      )
      .where(eq(eventRegistrations.userId, userId));
  }

  async getAvailableMentorships(limit: number = 10): Promise<any[]> {
    // Implementation pending
    return [];
  }

  async getMentorshipById(id: number): Promise<any | undefined> {
    // Implementation pending
    return undefined;
  }

  async applyForMentorship(application: { mentorshipId: number; userId: string; goalsDescription: string; }): Promise<any> {
    // Implementation pending
    return {};
  }

  async getUserMentorshipApplications(userId: string): Promise<any[]> {
    // Implementation pending
    return [];
  }

  // PREMIUM FEATURE 3: Skills Gap Accelerator
  async getAllSkills(category?: string): Promise<any[]> {
    // Implementation pending
    return [];
  }

  async getSkillById(id: number): Promise<any | undefined> {
    // Implementation pending
    return undefined;
  }

  async updateUserSkillLevel(id: number, currentLevel: number, targetLevel: number): Promise<UserSkill> {
    // Implementation pending
    return {} as UserSkill;
  }

  async getLearningResourcesBySkillIds(skillIds: number[]): Promise<any[]> {
    // Implementation pending
    return [];
  }

  async getLearningResourceById(id: number): Promise<any | undefined> {
    // Implementation pending
    return undefined;
  }

  async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    return db.select().from(userLearningPaths).where(eq(userLearningPaths.userId, userId));
  }

  async getLearningPathById(id: number): Promise<any | undefined> {
    // Implementation pending
    return undefined;
  }

  async createLearningPath(learningPathData: InsertLearningPath): Promise<LearningPath> {
    const [learningPath] = await db.insert(userLearningPaths).values(learningPathData).returning();
    return learningPath;
  }

  async addResourceToLearningPath(learningPathId: number, resourceId: number, order: number): Promise<any> {
    // Implementation pending
    return {};
  }

  async markResourceAsCompleted(learningPathId: number, resourceId: number): Promise<any> {
    // Implementation pending
    return {};
  }

  async getLearningPathProgress(learningPathId: number): Promise<number> {
    // Implementation pending
    return 0;
  }

  // Settings operations
  async getUserSettings(userId: string): Promise<any | null> {
    // Implementation for fetching user settings
    return null; // Return null if no settings exist
  }

  async updateUserSettings(userId: string, settings: any): Promise<any> {
    // Implementation for updating user settings
    return settings;
  }
}

export const storage = new DatabaseStorage();