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

  //======= PREMIUM FEATURE 1: Career Trajectory Mapping =======
  
  async getCareerPathsByUserId(userId: string): Promise<CareerPath[]> {
    return await db
      .select()
      .from(careerPaths)
      .where(eq(careerPaths.userId, userId))
      .orderBy(desc(careerPaths.createdAt));
  }
  
  async getCareerPathById(id: number): Promise<CareerPath | undefined> {
    const [careerPath] = await db
      .select()
      .from(careerPaths)
      .where(eq(careerPaths.id, id));
    return careerPath;
  }
  
  async createCareerPath(careerPathData: InsertCareerPath): Promise<CareerPath> {
    const [careerPath] = await db
      .insert(careerPaths)
      .values(careerPathData)
      .returning();
    return careerPath;
  }
  
  async updateCareerPath(id: number, updates: Partial<InsertCareerPath>): Promise<CareerPath> {
    const [updatedPath] = await db
      .update(careerPaths)
      .set({ 
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(careerPaths.id, id))
      .returning();
    return updatedPath;
  }
  
  async deleteCareerPath(id: number): Promise<void> {
    // First delete all related milestones and alternative paths
    await db.delete(careerMilestones).where(eq(careerMilestones.careerPathId, id));
    await db.delete(alternativePaths).where(eq(alternativePaths.careerPathId, id));
    // Then delete the career path
    await db.delete(careerPaths).where(eq(careerPaths.id, id));
  }
  
  async getMilestonesByCareerPathId(careerPathId: number): Promise<CareerMilestone[]> {
    return await db
      .select()
      .from(careerMilestones)
      .where(eq(careerMilestones.careerPathId, careerPathId))
      .orderBy(asc(careerMilestones.targetDate));
  }
  
  async createCareerMilestone(milestoneData: InsertCareerMilestone): Promise<CareerMilestone> {
    const [milestone] = await db
      .insert(careerMilestones)
      .values(milestoneData)
      .returning();
    return milestone;
  }
  
  async updateCareerMilestoneStatus(id: number, isCompleted: boolean): Promise<CareerMilestone> {
    const [milestone] = await db
      .update(careerMilestones)
      .set({ 
        isCompleted,
        completedDate: isCompleted ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(careerMilestones.id, id))
      .returning();
    return milestone;
  }
  
  async getAlternativePathsByCareerPathId(careerPathId: number): Promise<any[]> {
    return await db
      .select()
      .from(alternativePaths)
      .where(eq(alternativePaths.careerPathId, careerPathId));
  }
  
  //======= PREMIUM FEATURE 2: Executive Network Access =======

  async getUpcomingNetworkEvents(limit: number = 10): Promise<NetworkEvent[]> {
    const now = new Date();
    return await db
      .select()
      .from(networkEvents)
      .where(and(
        eq(networkEvents.isActive, true),
        sql`${networkEvents.eventDate} >= ${now}`
      ))
      .orderBy(asc(networkEvents.eventDate))
      .limit(limit);
  }
  
  async getNetworkEventById(id: number): Promise<NetworkEvent | undefined> {
    const [event] = await db
      .select()
      .from(networkEvents)
      .where(eq(networkEvents.id, id));
    return event;
  }
  
  async registerForEvent(registrationData: InsertEventRegistration): Promise<EventRegistration> {
    const [registration] = await db
      .insert(eventRegistrations)
      .values(registrationData)
      .returning();
    return registration;
  }
  
  async getUserEventRegistrations(userId: string): Promise<any[]> {
    return await db
      .select({
        id: eventRegistrations.id,
        eventId: eventRegistrations.eventId,
        registrationDate: eventRegistrations.registrationDate,
        attended: eventRegistrations.attended,
        event: {
          id: networkEvents.id,
          title: networkEvents.title,
          description: networkEvents.description,
          eventDate: networkEvents.eventDate,
          eventType: networkEvents.eventType,
          speakerInfo: networkEvents.speakerInfo,
          eventLink: networkEvents.eventLink
        }
      })
      .from(eventRegistrations)
      .innerJoin(networkEvents, eq(eventRegistrations.eventId, networkEvents.id))
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(desc(networkEvents.eventDate));
  }
  
  async getAvailableMentorships(limit: number = 10): Promise<any[]> {
    return await db
      .select()
      .from(mentorships)
      .where(and(
        eq(mentorships.isActive, true),
        sql`${mentorships.availableSlots} > 0`
      ))
      .limit(limit);
  }
  
  async getMentorshipById(id: number): Promise<any | undefined> {
    const [mentorship] = await db
      .select()
      .from(mentorships)
      .where(eq(mentorships.id, id));
    return mentorship;
  }
  
  async applyForMentorship(application: { mentorshipId: number, userId: string, goalsDescription: string }): Promise<any> {
    const [mentorshipApplication] = await db
      .insert(mentorshipApplications)
      .values({
        mentorshipId: application.mentorshipId,
        userId: application.userId,
        goalsDescription: application.goalsDescription,
        status: "pending"
      })
      .returning();
    return mentorshipApplication;
  }
  
  async getUserMentorshipApplications(userId: string): Promise<any[]> {
    return await db
      .select({
        id: mentorshipApplications.id,
        mentorshipId: mentorshipApplications.mentorshipId,
        applicationDate: mentorshipApplications.applicationDate,
        status: mentorshipApplications.status,
        goalsDescription: mentorshipApplications.goalsDescription,
        mentor: {
          id: mentorships.id,
          name: mentorships.mentorName,
          title: mentorships.mentorTitle,
          company: mentorships.mentorCompany,
          expertise: mentorships.expertise
        }
      })
      .from(mentorshipApplications)
      .innerJoin(mentorships, eq(mentorshipApplications.mentorshipId, mentorships.id))
      .where(eq(mentorshipApplications.userId, userId))
      .orderBy(desc(mentorshipApplications.applicationDate));
  }
  
  //======= PREMIUM FEATURE 3: Skills Gap Accelerator =======
  
  async getAllSkills(category?: string): Promise<any[]> {
    let query = db.select().from(skillsLibrary);
    
    if (category) {
      query = query.where(eq(skillsLibrary.category, category));
    }
    
    return await query.orderBy(asc(skillsLibrary.name));
  }
  
  async getSkillById(id: number): Promise<any | undefined> {
    const [skill] = await db
      .select()
      .from(skillsLibrary)
      .where(eq(skillsLibrary.id, id));
    return skill;
  }
  
  async getUserSkills(userId: string): Promise<UserSkill[]> {
    return await db
      .select({
        id: userSkills.id,
        userId: userSkills.userId,
        skillId: userSkills.skillId,
        currentLevel: userSkills.currentLevel,
        targetLevel: userSkills.targetLevel,
        priority: userSkills.priority,
        startDate: userSkills.startDate,
        targetDate: userSkills.targetDate,
        createdAt: userSkills.createdAt,
        updatedAt: userSkills.updatedAt,
        skill: {
          id: skillsLibrary.id,
          name: skillsLibrary.name,
          category: skillsLibrary.category,
          description: skillsLibrary.description,
          marketDemand: skillsLibrary.marketDemand,
          futureRelevance: skillsLibrary.futureRelevance
        }
      })
      .from(userSkills)
      .innerJoin(skillsLibrary, eq(userSkills.skillId, skillsLibrary.id))
      .where(eq(userSkills.userId, userId))
      .orderBy(desc(userSkills.priority));
  }
  
  async addUserSkill(userSkillData: InsertUserSkill): Promise<UserSkill> {
    const [userSkill] = await db
      .insert(userSkills)
      .values(userSkillData)
      .returning();
    return userSkill;
  }
  
  async updateUserSkillLevel(id: number, currentLevel: number, targetLevel: number): Promise<UserSkill> {
    const [userSkill] = await db
      .update(userSkills)
      .set({ 
        currentLevel,
        targetLevel,
        updatedAt: new Date()
      })
      .where(eq(userSkills.id, id))
      .returning();
    return userSkill;
  }
  
  async getLearningResourcesBySkillIds(skillIds: number[]): Promise<any[]> {
    const resourceSkillRows = await db
      .select()
      .from(resourceSkills)
      .where(sql`${resourceSkills.skillId} IN (${skillIds.join(',')})`);
    
    const resourceIds = resourceSkillRows.map(row => row.resourceId);
    
    if (resourceIds.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(learningResources)
      .where(sql`${learningResources.id} IN (${resourceIds.join(',')})`);
  }
  
  async getLearningResourceById(id: number): Promise<any | undefined> {
    const [resource] = await db
      .select()
      .from(learningResources)
      .where(eq(learningResources.id, id));
    return resource;
  }
  
  async getUserLearningPaths(userId: string): Promise<LearningPath[]> {
    return await db
      .select()
      .from(userLearningPaths)
      .where(eq(userLearningPaths.userId, userId))
      .orderBy(desc(userLearningPaths.createdAt));
  }
  
  async getLearningPathById(id: number): Promise<any | undefined> {
    const [path] = await db
      .select()
      .from(userLearningPaths)
      .where(eq(userLearningPaths.id, id));
    
    if (!path) {
      return undefined;
    }
    
    const resources = await db
      .select({
        id: learningPathResources.id,
        resourceId: learningPathResources.resourceId,
        order: learningPathResources.order,
        isCompleted: learningPathResources.isCompleted,
        completedDate: learningPathResources.completedDate,
        userNotes: learningPathResources.userNotes,
        resource: {
          id: learningResources.id,
          title: learningResources.title,
          description: learningResources.description,
          provider: learningResources.provider,
          resourceType: learningResources.resourceType,
          url: learningResources.url,
          duration: learningResources.duration,
          difficulty: learningResources.difficulty
        }
      })
      .from(learningPathResources)
      .innerJoin(learningResources, eq(learningPathResources.resourceId, learningResources.id))
      .where(eq(learningPathResources.learningPathId, id))
      .orderBy(asc(learningPathResources.order));
    
    return {
      ...path,
      resources
    };
  }
  
  async createLearningPath(learningPathData: InsertLearningPath): Promise<LearningPath> {
    const [learningPath] = await db
      .insert(userLearningPaths)
      .values(learningPathData)
      .returning();
    return learningPath;
  }
  
  async addResourceToLearningPath(learningPathId: number, resourceId: number, order: number): Promise<any> {
    const [pathResource] = await db
      .insert(learningPathResources)
      .values({
        learningPathId,
        resourceId,
        order,
        isCompleted: false
      })
      .returning();
    return pathResource;
  }
  
  async markResourceAsCompleted(learningPathId: number, resourceId: number): Promise<any> {
    const [pathResource] = await db
      .update(learningPathResources)
      .set({ 
        isCompleted: true,
        completedDate: new Date()
      })
      .where(and(
        eq(learningPathResources.learningPathId, learningPathId),
        eq(learningPathResources.resourceId, resourceId)
      ))
      .returning();
    
    // Update progress in the learning path
    await this.getLearningPathProgress(learningPathId);
    
    return pathResource;
  }
  
  async getLearningPathProgress(learningPathId: number): Promise<number> {
    const resources = await db
      .select({
        total: sql`count(*)`,
        completed: sql`sum(case when ${learningPathResources.isCompleted} = true then 1 else 0 end)`
      })
      .from(learningPathResources)
      .where(eq(learningPathResources.learningPathId, learningPathId));
    
    const { total, completed } = resources[0];
    const progress = (total > 0) ? Math.round((completed / total) * 100) : 0;
    
    // Update the progress in the learning path
    await db
      .update(userLearningPaths)
      .set({ progress })
      .where(eq(userLearningPaths.id, learningPathId));
    
    return progress;
  }
}

export const storage = new DatabaseStorage();
