import { 
  users, 
  profiles, 
  vectors,
  type User, 
  type UpsertUser,
  type Profile,
  type Vector,
  type InsertVector
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
