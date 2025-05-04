import { 
  users, 
  profiles, 
  vectors,
  careerPaths,
  careerMilestones,
  alternativePaths,
  networkEvents,
  eventRegistrations,
  mentorships,
  mentorshipApplications,
  skillsLibrary,
  userSkills,
  learningResources,
  resourceSkills,
  userLearningPaths,
  learningPathResources,
  type User, 
  type UpsertUser,
  type Profile,
  type Vector,
  type InsertVector,
  type InsertCareerPath,
  type CareerPath,
  type InsertCareerMilestone,
  type CareerMilestone,
  type NetworkEvent,
  type InsertEventRegistration,
  type EventRegistration,
  type InsertUserSkill,
  type UserSkill,
  type InsertLearningPath,
  type LearningPath
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, sql, asc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Profile operations
  getProfileByUserId(userId: string): Promise<Profile | undefined>;
  createProfile(profile: { userId: string, resumeText: string | null, lastScan: Date | null }): Promise<Profile>;
  updateProfileResume(userId: string, resumeText: string): Promise<Profile>;
  
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
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
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
  
  async createProfile(profileData: { userId: string, resumeText: string | null, lastScan: Date | null }): Promise<Profile> {
    const [profile] = await db
      .insert(profiles)
      .values(profileData)
      .returning();
    return profile;
  }
  
  async updateProfileResume(userId: string, resumeText: string): Promise<Profile> {
    const [profile] = await db
      .update(profiles)
      .set({ 
        resumeText, 
        lastScan: new Date(),
        updatedAt: new Date()
      })
      .where(eq(profiles.userId, userId))
      .returning();
    return profile;
  }
  
  // Vector operations
  async getVectorsByUserId(userId: string): Promise<Vector[]> {
    return await db.select().from(vectors).where(eq(vectors.userId, userId));
  }
  
  async createVector(vectorData: InsertVector): Promise<Vector> {
    const [vector] = await db
      .insert(vectors)
      .values(vectorData)
      .returning();
    return vector;
  }
  
  async deleteVectorsByUserId(userId: string): Promise<void> {
    await db.delete(vectors).where(eq(vectors.userId, userId));
  }
}

export const storage = new DatabaseStorage();
